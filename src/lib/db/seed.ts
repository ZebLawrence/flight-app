import { seedPhase0 } from './seeds/phase-0';
import { seedPhase1 } from './seeds/phase-1';
import { seedPhase4 } from './seeds/phase-4';
import { seedTemplates } from './seeds/templates';

async function main() {
  console.log('Running seed...');
  await seedPhase0();
  await seedPhase1();
  await seedPhase4();
  await seedTemplates();
  console.log('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
