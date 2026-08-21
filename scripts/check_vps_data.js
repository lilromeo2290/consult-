const {PrismaClient} = require('/home/kpma-rms/node_modules/.prisma/client');
const p = new PrismaClient();

async function main() {
  const rows = await p.rmsData.findMany({select:{key:true,data:true}});
  rows.forEach(r => {
    try {
      const d = JSON.parse(r.data);
      console.log(r.key + '\t' + d.length);
    } catch(e) {
      console.log(r.key + '\tparse-error');
    }
  });
  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
