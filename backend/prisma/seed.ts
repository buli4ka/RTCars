import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const sources: { slug: string; name: string }[] = [
  { slug: 'copart', name: 'Copart' },
  { slug: 'iaa', name: 'IAA' },
];

async function main(): Promise<void> {
  for (const source of sources) {
    const result = await prisma.source.upsert({
      where: { slug: source.slug },
      update: { name: source.name },
      create: source,
    });
    console.log(`Seeded source: ${result.slug} (id=${result.id})`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
    void pool.end();
  });
