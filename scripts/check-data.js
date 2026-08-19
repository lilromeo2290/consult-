const { PrismaClient } = require("@prisma/client-2");
process.env.DATABASE_URL = "file:/home/kpma-rms/rms.db";
const prisma = new PrismaClient();
async function main() {
  const keys = await prisma.rmsData.findMany({ select: { key: true } });
  for (const k of keys) {
    const data = await prisma.rmsData.findUnique({ where: { key: k.key } });
    let arr = [];
    try { arr = JSON.parse(data.data); } catch { arr = [data.data]; }
    console.log(k.key + ': ' + arr.length + ' records');
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
