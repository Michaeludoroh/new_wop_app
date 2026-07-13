import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PolicyType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EmailTemplateService } from '../email/email-template.service';
import { AcceptPolicyDto } from './dto/accept-policy.dto';
import { CreatePolicyDto } from './dto/create-policy.dto';
import {
  POLICY_TYPE_LABELS,
  POLICY_TYPES,
  policyTypeToSlugPrefix,
} from './dto/policy-type.constants';
import { PolicyQueryDto } from './dto/policy-query.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';

type RequestUser = {
  sub: string;
  role: Role;
};

type PolicyRecord = {
  id: string;
  type: PolicyType;
  title: string;
  slug: string;
  content: string;
  version: number;
  published: boolean;
  effectiveDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  _count?: { acceptances: number };
};

@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  async getPublishReadiness() {
    const publishedPolicies = await this.prisma.policy.findMany({
      where: { deletedAt: null, published: true },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });

    const activeByType = new Map<PolicyType, PolicyRecord>();
    for (const policy of publishedPolicies) {
      if (!this.isEffective(policy)) continue;
      const existing = activeByType.get(policy.type);
      if (!existing || policy.version > existing.version) {
        activeByType.set(policy.type, policy);
      }
    }

    const missingTypes = POLICY_TYPES.filter((type) => !activeByType.has(type));

    return {
      ready: missingTypes.length === 0,
      missingTypes,
      activePolicies: POLICY_TYPES.filter((type) => activeByType.has(type)).map(
        (type) => this.toResponse(activeByType.get(type)!),
      ),
    };
  }

  listTypes() {
    return {
      data: POLICY_TYPES.map((value) => ({
        value,
        label: POLICY_TYPE_LABELS[value],
      })),
    };
  }

  private toResponse(item: PolicyRecord) {
    return {
      id: item.id,
      type: item.type,
      typeLabel: POLICY_TYPE_LABELS[item.type],
      title: item.title,
      slug: item.slug,
      content: item.content,
      version: item.version,
      published: item.published,
      effectiveDate: item.effectiveDate,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      acceptanceCount: item._count?.acceptances ?? undefined,
    };
  }

  private buildListWhere(query: PolicyQueryDto, publishedOnly: boolean) {
    return {
      deletedAt: null as null,
      ...(publishedOnly ? { published: true } : {}),
      ...(!publishedOnly && query.published !== undefined
        ? { published: query.published }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              {
                title: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                content: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                slug: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };
  }

  private isEffective(policy: PolicyRecord, at = new Date()) {
    if (!policy.published) return false;
    if (!policy.effectiveDate) return true;
    return policy.effectiveDate <= at;
  }

  private async resolveNextVersion(type: PolicyType, requested?: number) {
    if (requested) return requested;

    const latest = await this.prisma.policy.findFirst({
      where: { type, deletedAt: null },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return (latest?.version ?? 0) + 1;
  }

  private buildSlug(type: PolicyType, version: number, customSlug?: string) {
    if (customSlug?.trim()) {
      return customSlug.trim().toLowerCase().replace(/\s+/g, '-');
    }
    return `${policyTypeToSlugPrefix(type)}-v${version}`;
  }

  private async ensureUniqueSlug(slug: string, excludeId?: string) {
    const existing = await this.prisma.policy.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Policy slug already exists');
    }
  }

  async listPublic(query: PolicyQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(query, true);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.policy.findMany({
        where,
        orderBy: [{ type: 'asc' }, { version: 'desc' }],
        take: limit,
        skip,
      }),
      this.prisma.policy.count({ where }),
    ]);

    const effectiveItems = items.filter((item) => this.isEffective(item));
    const currentByType = new Map<PolicyType, PolicyRecord>();

    for (const item of effectiveItems) {
      const existing = currentByType.get(item.type);
      if (!existing || item.version > existing.version) {
        currentByType.set(item.type, item);
      }
    }

    const data = query.type
      ? currentByType.has(query.type)
        ? [this.toResponse(currentByType.get(query.type)!)]
        : []
      : POLICY_TYPES.filter((type) => currentByType.has(type)).map((type) =>
          this.toResponse(currentByType.get(type)!),
        );

    return {
      data,
      meta: {
        page,
        limit,
        total: data.length,
        totalPages: 1,
        filteredTotal: total,
      },
    };
  }

  async findCurrentByType(type: PolicyType) {
    const policies = await this.prisma.policy.findMany({
      where: {
        type,
        deletedAt: null,
        published: true,
      },
      orderBy: { version: 'desc' },
    });

    const current = policies.find((policy) => this.isEffective(policy));
    if (!current) {
      throw new NotFoundException('No active policy found for this type');
    }

    return this.toResponse(current);
  }

  async findPublicById(id: string) {
    const item = await this.prisma.policy.findFirst({
      where: {
        id,
        deletedAt: null,
        published: true,
      },
    });

    if (!item || !this.isEffective(item)) {
      throw new NotFoundException('Policy not found');
    }

    return this.toResponse(item);
  }

  async findPublicBySlug(slug: string) {
    const item = await this.prisma.policy.findFirst({
      where: {
        slug,
        deletedAt: null,
        published: true,
      },
    });

    if (!item || !this.isEffective(item)) {
      throw new NotFoundException('Policy not found');
    }

    return this.toResponse(item);
  }

  async listAdmin(query: PolicyQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(query, false);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.policy.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        take: limit,
        skip,
        include: {
          _count: { select: { acceptances: true } },
        },
      }),
      this.prisma.policy.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toResponse(item)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listVersionHistory(type: PolicyType) {
    const items = await this.prisma.policy.findMany({
      where: { type, deletedAt: null },
      orderBy: { version: 'desc' },
      include: {
        _count: { select: { acceptances: true } },
      },
    });

    return {
      data: items.map((item) => this.toResponse(item)),
      meta: { type, total: items.length },
    };
  }

  async findAdminById(id: string) {
    const item = await this.prisma.policy.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { acceptances: true } },
      },
    });

    if (!item) throw new NotFoundException('Policy not found');
    return this.toResponse(item);
  }

  async create(user: RequestUser, dto: CreatePolicyDto) {
    const version = await this.resolveNextVersion(dto.type, dto.version);
    const slug = this.buildSlug(dto.type, version, dto.slug);
    await this.ensureUniqueSlug(slug);

    const shouldPublish = dto.published === true;

    const created = await this.prisma.policy.create({
      data: {
        type: dto.type,
        title: dto.title,
        slug,
        content: dto.content,
        version,
        published: shouldPublish,
        effectiveDate: dto.effectiveDate ?? null,
      },
      include: {
        _count: { select: { acceptances: true } },
      },
    });

    if (shouldPublish) {
      await this.unpublishOtherVersions(created.id, created.type);
    }

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'POLICY_CREATED',
        resource: 'POLICY',
        resourceId: created.id,
        metadata: {
          policyId: created.id,
          type: created.type,
          version: created.version,
          published: created.published,
        } as Prisma.JsonObject,
      },
    });

    return this.toResponse(created);
  }

  async update(id: string, user: RequestUser, dto: UpdatePolicyDto) {
    const existing = await this.prisma.policy.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Policy not found');

    if (dto.slug !== undefined) {
      await this.ensureUniqueSlug(dto.slug, id);
    }

    const data: Prisma.PolicyUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.effectiveDate !== undefined) {
      data.effectiveDate = dto.effectiveDate;
    }
    if (dto.published !== undefined) {
      data.published = dto.published;
    }

    const updated = await this.prisma.policy.update({
      where: { id },
      data,
      include: {
        _count: { select: { acceptances: true } },
      },
    });

    if (dto.published === true) {
      await this.unpublishOtherVersions(updated.id, updated.type);
    }

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'POLICY_UPDATED',
        resource: 'POLICY',
        resourceId: updated.id,
        metadata: {
          policyId: updated.id,
          changedFields: Object.keys(dto),
        } as Prisma.JsonObject,
      },
    });

    return this.toResponse(updated);
  }

  async publish(id: string, user: RequestUser) {
    const existing = await this.prisma.policy.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Policy not found');

    const updated = await this.prisma.policy.update({
      where: { id },
      data: {
        published: true,
        effectiveDate: existing.effectiveDate ?? new Date(),
      },
      include: {
        _count: { select: { acceptances: true } },
      },
    });

    await this.unpublishOtherVersions(updated.id, updated.type);

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'POLICY_PUBLISHED',
        resource: 'POLICY',
        resourceId: updated.id,
        metadata: { policyId: updated.id, version: updated.version } as Prisma.JsonObject,
      },
    });

    await this.notifyPolicyUpdate(updated);

    return this.toResponse(updated);
  }

  private async notifyPolicyUpdate(policy: PolicyRecord) {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, fullName: true },
      take: 500,
    });

    if (users.length === 0) return;

    const label = POLICY_TYPE_LABELS[policy.type];
    await this.emailService.send(
      users.map((user) => {
        const content = this.emailTemplateService.policyUpdateEmail(
          user.fullName,
          label,
          policy.version,
        );
        return {
          to: user.email,
          subject: content.subject,
          body: content.body,
          html: content.html,
          dedupeKey: `policy-update:${policy.id}:${user.id}`,
        };
      }),
    ).catch(() => undefined);
  }

  async unpublish(id: string, user: RequestUser) {
    const existing = await this.prisma.policy.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Policy not found');

    const updated = await this.prisma.policy.update({
      where: { id },
      data: { published: false },
      include: {
        _count: { select: { acceptances: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'POLICY_UNPUBLISHED',
        resource: 'POLICY',
        resourceId: updated.id,
        metadata: { policyId: updated.id } as Prisma.JsonObject,
      },
    });

    return this.toResponse(updated);
  }

  async remove(id: string, user: RequestUser) {
    const existing = await this.prisma.policy.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Policy not found');

    await this.prisma.policy.update({
      where: { id },
      data: { deletedAt: new Date(), published: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'POLICY_DELETED',
        resource: 'POLICY',
        resourceId: id,
        metadata: { policyId: id } as Prisma.JsonObject,
      },
    });

    return { success: true };
  }

  private async unpublishOtherVersions(policyId: string, type: PolicyType) {
    await this.prisma.policy.updateMany({
      where: {
        type,
        deletedAt: null,
        published: true,
        NOT: { id: policyId },
      },
      data: { published: false },
    });
  }

  async getAcceptanceStatus(userId: string) {
    const currentPolicies = await Promise.all(
      POLICY_TYPES.map(async (type) => {
        try {
          return await this.findCurrentByType(type);
        } catch {
          return null;
        }
      }),
    );

    const activePolicies = currentPolicies.filter(
      (policy): policy is NonNullable<typeof policy> => policy !== null,
    );

    const acceptances = await this.prisma.policyAcceptance.findMany({
      where: {
        userId,
        policyId: { in: activePolicies.map((policy) => policy.id) },
      },
    });

    const acceptanceByPolicyId = new Map(
      acceptances.map((item) => [item.policyId, item]),
    );

    const pending = activePolicies.filter((policy) => {
      const acceptance = acceptanceByPolicyId.get(policy.id);
      return !acceptance || acceptance.version < policy.version;
    });

    const accepted = activePolicies
      .filter((policy) => {
        const acceptance = acceptanceByPolicyId.get(policy.id);
        return acceptance && acceptance.version >= policy.version;
      })
      .map((policy) => {
        const acceptance = acceptanceByPolicyId.get(policy.id)!;
        return {
          policy,
          acceptedAt: acceptance.acceptedAt,
          version: acceptance.version,
        };
      });

    return {
      pending,
      accepted,
      requiresAction: pending.length > 0,
    };
  }

  async acceptPolicy(userId: string, dto: AcceptPolicyDto) {
    const policy = await this.prisma.policy.findFirst({
      where: {
        id: dto.policyId,
        deletedAt: null,
        published: true,
      },
    });

    if (!policy || !this.isEffective(policy)) {
      throw new NotFoundException('Policy not found or not currently active');
    }

    const acceptance = await this.prisma.policyAcceptance.upsert({
      where: {
        userId_policyId: {
          userId,
          policyId: policy.id,
        },
      },
      create: {
        userId,
        policyId: policy.id,
        version: policy.version,
      },
      update: {
        version: policy.version,
        acceptedAt: new Date(),
      },
    });

    return {
      success: true,
      acceptance: {
        policyId: acceptance.policyId,
        version: acceptance.version,
        acceptedAt: acceptance.acceptedAt,
      },
      policy: this.toResponse(policy),
    };
  }

  async getAcceptanceAnalytics() {
    const [policies, totalUsers, acceptanceGroups] = await Promise.all([
      this.prisma.policy.findMany({
        where: { deletedAt: null },
        orderBy: [{ type: 'asc' }, { version: 'desc' }],
        include: {
          _count: { select: { acceptances: true } },
        },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.policyAcceptance.groupBy({
        by: ['policyId'],
        _count: { _all: true },
      }),
    ]);

    const acceptanceCountByPolicyId = new Map(
      acceptanceGroups.map((group) => [group.policyId, group._count._all]),
    );

    const currentByType = new Map<PolicyType, PolicyRecord>();
    for (const policy of policies) {
      if (!policy.published || !this.isEffective(policy)) continue;
      const existing = currentByType.get(policy.type);
      if (!existing || policy.version > existing.version) {
        currentByType.set(policy.type, policy);
      }
    }

    const currentPolicies = POLICY_TYPES.map((type) => currentByType.get(type))
      .filter((policy): policy is PolicyRecord => policy !== undefined);

    const summary = currentPolicies.map((policy) => {
      const acceptedCount =
        acceptanceCountByPolicyId.get(policy.id) ??
        policy._count?.acceptances ??
        0;
      const pendingCount = Math.max(totalUsers - acceptedCount, 0);

      return {
        policy: this.toResponse(policy),
        acceptedCount,
        pendingCount,
        totalUsers,
        acceptanceRate:
          totalUsers > 0 ? Number((acceptedCount / totalUsers).toFixed(4)) : 0,
      };
    });

    const versionHistory = policies.map((policy) => ({
      ...this.toResponse(policy),
      acceptanceCount:
        acceptanceCountByPolicyId.get(policy.id) ??
        policy._count?.acceptances ??
        0,
    }));

    return {
      summary,
      versionHistory,
      totals: {
        users: totalUsers,
        activePolicies: currentPolicies.length,
        totalAcceptances: acceptanceGroups.reduce(
          (sum, group) => sum + group._count._all,
          0,
        ),
      },
    };
  }
}
