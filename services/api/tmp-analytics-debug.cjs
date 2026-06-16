const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const failed = await prisma.paymentWebhookEvent.count({
      where: { processingStatus: 'FAILED' },
    });
    const duplicate = await prisma.paymentWebhookEvent.count({
      where: { processingStatus: 'DUPLICATE' },
    });
    const processed = await prisma.paymentWebhookEvent.count({
      where: { processingStatus: 'PROCESSED' },
    });

    console.log(
      JSON.stringify({
        ok: true,
        webhookCounts: { failed, duplicate, processed },
      }),
    );
  } catch (error) {
    console.error('ANALYTICS_DEBUG_ERROR');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
