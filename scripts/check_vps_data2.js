const {PrismaClient} = require('/home/kpma-rms/node_modules/.prisma/client');
const p = new PrismaClient();

async function main() {
  const bpRow = await p.rmsData.findUnique({where:{key:'rms-building-permits'}});
  const bps = JSON.parse(bpRow.data);
  console.log('=== BP all keys (first) ===');
  if (bps[0]) console.log(JSON.stringify(bps[0], null, 2));
  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });