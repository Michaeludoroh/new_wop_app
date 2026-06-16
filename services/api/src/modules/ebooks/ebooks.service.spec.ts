import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { ContentStatus, PaymentStatus, Prisma, TransactionType } from '@prisma/client';

import { EbooksService } from './ebooks.service';



const publishedEbook = {

  id: 'ebook_1',

  title: 'Published eBook',

  author: 'Author',

  description: 'Description',

  category: 'GENERAL',

  price: new Prisma.Decimal(10),

  isPremium: true,

  fileUrl: 'https://example.com/book.pdf',

  coverUrl: null,

  status: ContentStatus.PUBLISHED,

  publishedAt: new Date(),

  createdAt: new Date(),

  updatedAt: new Date(),

  deletedAt: null,

};



function createService(overrides: Record<string, unknown> = {}) {

  const prisma = {

    ebook: {

      findMany: jest.fn().mockResolvedValue([publishedEbook]),

      findFirst: jest.fn().mockResolvedValue(publishedEbook),

      findUnique: jest.fn().mockResolvedValue(publishedEbook),

      count: jest.fn().mockResolvedValue(1),

      create: jest.fn().mockResolvedValue(publishedEbook),

      update: jest.fn().mockResolvedValue(publishedEbook),

      aggregate: jest.fn(),

      groupBy: jest.fn().mockResolvedValue([]),

    },

    ebookPurchase: {

      findUnique: jest.fn().mockResolvedValue(null),

      upsert: jest.fn().mockResolvedValue({ id: 'purchase_1' }),

      count: jest.fn().mockResolvedValue(0),

      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),

      groupBy: jest.fn().mockResolvedValue([]),

    },

    paymentTransaction: {

      findUnique: jest.fn().mockResolvedValue(null),

    },

    readingProgress: {

      findMany: jest.fn().mockResolvedValue([]),

      findUnique: jest.fn().mockResolvedValue(null),

      upsert: jest.fn().mockResolvedValue({

        ebookId: 'ebook_1',

        currentPage: 2,

        totalPages: 10,

        progressPct: 20,

        bookmarkPages: [],

        downloaded: true,

        downloadedAt: new Date(),

        lastReadAt: new Date(),

        ebook: publishedEbook,

      }),

      count: jest.fn().mockResolvedValue(0),

      groupBy: jest.fn().mockResolvedValue([]),

    },

    userSubscription: {

      findFirst: jest.fn().mockResolvedValue(null),

    },

    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),

    ...overrides,

  };



  const contentAccessService = {
    issueAccessToken: jest.fn().mockReturnValue({
      accessToken: 'signed-token',
      expiresInSeconds: 900,
      expiresAt: new Date().toISOString(),
    }),
    validateAccessToken: jest.fn().mockReturnValue({ valid: true }),
    validateResourceAccessToken: jest.fn().mockReturnValue({ valid: true, userId: 'user_1' }),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'API_PUBLIC_URL') return 'http://localhost:4000';
      return undefined;
    }),
  };

  const service = new EbooksService(
    prisma as never,
    { createTargeted: jest.fn().mockResolvedValue({}) } as never,
    contentAccessService as never,
    configService as never,
  );



  return { service, prisma, contentAccessService, configService };

}



describe('EbooksService payment enforcement', () => {

  it('rejects direct purchase without a verified payment reference', async () => {

    const { service } = createService();



    await expect(

      service.purchase('user_1', { ebookId: 'ebook_1' }),

    ).rejects.toBeInstanceOf(BadRequestException);

  });



  it('rejects purchase confirmation when payment is not successful', async () => {

    const { service, prisma } = createService();

    prisma.paymentTransaction.findUnique.mockResolvedValue({

      userId: 'user_1',

      status: PaymentStatus.PENDING,

      transactionType: TransactionType.EBOOK_PURCHASE,

      metadata: { ebookId: 'ebook_1' },

    });



    await expect(

      service.purchase('user_1', {

        ebookId: 'ebook_1',

        paymentReference: 'wop_ebook_pending',

      }),

    ).rejects.toBeInstanceOf(ForbiddenException);

  });



  it('creates entitlement only for a matching verified eBook transaction', async () => {

    const { service, prisma } = createService();

    prisma.paymentTransaction.findUnique.mockResolvedValue({

      userId: 'user_1',

      providerReference: 'wop_ebook_success',

      status: PaymentStatus.SUCCESS,

      transactionType: TransactionType.EBOOK_PURCHASE,

      amount: new Prisma.Decimal(10),

      metadata: { ebookId: 'ebook_1' },

    });



    await service.purchase('user_1', {

      ebookId: 'ebook_1',

      paymentReference: 'wop_ebook_success',

    });



    expect(prisma.ebookPurchase.upsert).toHaveBeenCalledWith(

      expect.objectContaining({

        where: { userId_ebookId: { userId: 'user_1', ebookId: 'ebook_1' } },

      }),

    );

  });

});



describe('EbooksService content lifecycle', () => {

  it('returns only published ebooks for public detail lookup', async () => {

    const { service, prisma } = createService();

    prisma.ebook.findFirst.mockResolvedValueOnce(null);



    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.ebook.findFirst).toHaveBeenCalledWith(

      expect.objectContaining({

        where: expect.objectContaining({

          status: ContentStatus.PUBLISHED,

          deletedAt: null,

        }),

      }),

    );

  });



  it('creates draft ebooks by default', async () => {

    const { service, prisma } = createService();



    await service.create({

      title: 'New Book',

      fileUrl: 'https://example.com/book.pdf',

    });



    expect(prisma.ebook.create).toHaveBeenCalledWith(

      expect.objectContaining({

        data: expect.objectContaining({

          status: ContentStatus.DRAFT,

          publishedAt: null,

        }),

      }),

    );

  });



  it('soft deletes ebooks by archiving them', async () => {

    const { service, prisma } = createService();



    await service.remove('ebook_1');



    expect(prisma.ebook.update).toHaveBeenCalledWith(

      expect.objectContaining({

        data: expect.objectContaining({

          status: ContentStatus.ARCHIVED,

          deletedAt: expect.any(Date),

        }),

      }),

    );

  });

});



describe('EbooksService access security', () => {
  it('omits direct file URLs from public ebook responses', async () => {
    const { service } = createService();

    const result = await service.findOne('ebook_1');

    expect(result.data).not.toHaveProperty('fileUrl');
    expect(result.data).not.toHaveProperty('pdfPath');
  });

  it('returns signed stream URLs instead of raw file URLs on access', async () => {
    const { service, prisma } = createService();
    prisma.ebook.findFirst.mockResolvedValue({
      ...publishedEbook,
      isPremium: false,
    });

    const result = await service.access('user_1', 'ebook_1');

    expect(result.authorized).toBe(true);
    expect(result.streamUrl).toContain('/api/v1/ebooks/ebook_1/stream?token=');
    expect(result).not.toHaveProperty('fileUrl');
  });
});

describe('EbooksService reading progress', () => {

  it('records download timestamps when progress marks downloaded', async () => {

    const { service, prisma } = createService();

    prisma.ebook.findFirst.mockResolvedValue({
      ...publishedEbook,
      isPremium: false,
    });

    await service.updateReadingProgress('user_1', 'ebook_1', {

      currentPage: 3,

      totalPages: 10,

      downloaded: true,

    });



    expect(prisma.readingProgress.upsert).toHaveBeenCalledWith(

      expect.objectContaining({

        update: expect.objectContaining({

          downloaded: true,

          downloadedAt: expect.any(Date),

        }),

      }),

    );

  });



  it('returns recently read progress ordered for the user', async () => {

    const { service, prisma } = createService();

    prisma.readingProgress.findMany.mockResolvedValue([

      {

        ebookId: 'ebook_1',

        currentPage: 4,

        totalPages: 10,

        progressPct: 40,

        bookmarkPages: [],

        downloaded: false,

        downloadedAt: null,

        lastReadAt: new Date(),

        ebook: publishedEbook,

      },

    ]);



    const result = await service.getRecentlyRead('user_1', 5);



    expect(result.data).toHaveLength(1);

    expect(result.data[0].ebookId).toBe('ebook_1');

  });

});


