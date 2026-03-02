import { Prisma, PrismaClient } from "@prisma/client";
import { SEED_QUESTIONS } from "../src/lib/matching/seed-data";

const prisma = new PrismaClient();

async function main() {
  for (const q of SEED_QUESTIONS) {
    const scaleOptions = q.scaleOptions === null
      ? Prisma.JsonNull
      : (q.scaleOptions as Prisma.InputJsonValue);
    const data = {
      code: q.code,
      dimension: q.dimension,
      side: q.side,
      pairCode: q.pairCode,
      questionText: q.questionText,
      inputType: q.inputType,
      scaleOptions,
      orderIndex: q.orderIndex,
      isActive: q.isActive,
    };
    await prisma.matchingQuestion.upsert({
      where: { code: q.code },
      create: data,
      update: data,
    });
  }
  console.log(`Seeded ${SEED_QUESTIONS.length} matching questions`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
