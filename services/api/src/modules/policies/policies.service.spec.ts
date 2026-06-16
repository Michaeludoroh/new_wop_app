import { PolicyType } from '@prisma/client';
import { PoliciesService } from './policies.service';

const policy = {
  id: 'policy-1',
  type: PolicyType.TERMS_OF_USE,
  title: 'Terms of Use',
  slug: 'terms-of-use-v1',
  content: 'These are the terms.',
  version: 1,
  published: true,
  effectiveDate: new Date('2026-01-01'),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  _count: { acceptances: 3 },
};

function createService() {
  const prismaMock: any = {
    policy: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    policyAcceptance: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  const emailService = {
    send: jest.fn().mockResolvedValue({ success: true }),
  };
  const emailTemplateService = {
    buildPolicyUpdateEmail: jest.fn().mockReturnValue({
      subject: 'Policy updated',
      text: 'Policy updated',
      html: '<p>Policy updated</p>',
    }),
  };

  const service = new PoliciesService(
    prismaMock,
    emailService as never,
    emailTemplateService as never,
  );
  return { service, prismaMock, emailService, emailTemplateService };
}

describe('PoliciesService', () => {
  it('persists type, slug, version, and published on create', async () => {
    const { service, prismaMock } = createService();
    prismaMock.policy.findFirst.mockResolvedValue(null);
    prismaMock.policy.create.mockResolvedValue(policy);
    prismaMock.policy.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.auditLog.create.mockResolvedValue({});

    await service.create(
      { sub: 'admin-1', role: 'ADMIN' },
      {
        type: PolicyType.TERMS_OF_USE,
        title: 'Terms of Use',
        content: 'These are the terms.',
        published: true,
      },
    );

    expect(prismaMock.policy.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PolicyType.TERMS_OF_USE,
          title: 'Terms of Use',
          content: 'These are the terms.',
          version: 1,
          published: true,
          slug: 'terms-of-use-v1',
        }),
      }),
    );
  });

  it('returns current active policy by type', async () => {
    const { service, prismaMock } = createService();
    prismaMock.policy.findMany.mockResolvedValue([policy]);

    const result = await service.findCurrentByType(PolicyType.TERMS_OF_USE);

    expect(result.type).toBe(PolicyType.TERMS_OF_USE);
    expect(result.version).toBe(1);
    expect(result.content).toBe('These are the terms.');
  });

  it('filters admin list by type and published state', async () => {
    const { service, prismaMock } = createService();
    prismaMock.policy.findMany.mockResolvedValue([policy]);
    prismaMock.policy.count.mockResolvedValue(1);

    await service.listAdmin({
      page: 1,
      limit: 20,
      type: PolicyType.PRIVACY_POLICY,
      published: false,
    });

    expect(prismaMock.policy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          type: PolicyType.PRIVACY_POLICY,
          published: false,
        }),
      }),
    );
  });

  it('soft deletes policies', async () => {
    const { service, prismaMock } = createService();
    prismaMock.policy.findFirst.mockResolvedValue(policy);
    prismaMock.policy.update.mockResolvedValue({
      ...policy,
      deletedAt: new Date(),
      published: false,
    });
    prismaMock.auditLog.create.mockResolvedValue({});

    const result = await service.remove('policy-1', {
      sub: 'admin-1',
      role: 'ADMIN',
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.policy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'policy-1' },
        data: expect.objectContaining({ published: false }),
      }),
    );
  });

  it('unpublishes other versions when publishing', async () => {
    const { service, prismaMock } = createService();
    prismaMock.policy.findFirst.mockResolvedValue({ ...policy, published: false });
    prismaMock.policy.update.mockResolvedValue(policy);
    prismaMock.policy.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.auditLog.create.mockResolvedValue({});

    await service.publish('policy-1', { sub: 'admin-1', role: 'ADMIN' });

    expect(prismaMock.policy.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: PolicyType.TERMS_OF_USE,
          published: true,
          NOT: { id: 'policy-1' },
        }),
      }),
    );
  });

  it('records policy acceptance for the active version', async () => {
    const { service, prismaMock } = createService();
    prismaMock.policy.findFirst.mockResolvedValue(policy);
    prismaMock.policyAcceptance.upsert.mockResolvedValue({
      userId: 'user-1',
      policyId: 'policy-1',
      version: 1,
      acceptedAt: new Date(),
    });

    const result = await service.acceptPolicy('user-1', { policyId: 'policy-1' });

    expect(prismaMock.policyAcceptance.upsert).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.acceptance.version).toBe(1);
  });

  it('returns pending policies when user has not accepted current version', async () => {
    const { service, prismaMock } = createService();
    prismaMock.policy.findMany.mockImplementation(({ where }: { where: { type?: PolicyType } }) => {
      if (where.type === PolicyType.TERMS_OF_USE) {
        return Promise.resolve([policy]);
      }
      return Promise.resolve([]);
    });
    prismaMock.policyAcceptance.findMany.mockResolvedValue([]);

    const status = await service.getAcceptanceStatus('user-1');

    expect(status.requiresAction).toBe(true);
    expect(status.pending).toHaveLength(1);
    expect(status.pending[0].type).toBe(PolicyType.TERMS_OF_USE);
  });

  it('reports publish readiness for required policy types', async () => {
    const { service, prismaMock } = createService();
    prismaMock.policy.findMany.mockResolvedValue([
      { ...policy, type: PolicyType.TERMS_OF_USE },
      { ...policy, id: 'policy-2', type: PolicyType.PRIVACY_POLICY, slug: 'privacy-policy-v1' },
      { ...policy, id: 'policy-3', type: PolicyType.COMMUNITY_GUIDELINES, slug: 'community-guidelines-v1' },
      {
        ...policy,
        id: 'policy-4',
        type: PolicyType.CONTENT_SHARING_RULES,
        slug: 'content-sharing-rules-v1',
      },
    ]);

    const readiness = await service.getPublishReadiness();

    expect(readiness.ready).toBe(true);
    expect(readiness.missingTypes).toEqual([]);
  });

  it('returns acceptance analytics summary', async () => {
    const { service, prismaMock } = createService();
    prismaMock.policy.findMany.mockResolvedValue([policy]);
    prismaMock.user.count.mockResolvedValue(10);
    prismaMock.policyAcceptance.groupBy.mockResolvedValue([
      { policyId: 'policy-1', _count: { _all: 4 } },
    ]);

    const analytics = await service.getAcceptanceAnalytics();

    expect(analytics.totals.users).toBe(10);
    expect(analytics.summary).toHaveLength(1);
    expect(analytics.summary[0].acceptedCount).toBe(4);
  });
});
