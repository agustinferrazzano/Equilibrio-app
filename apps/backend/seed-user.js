require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/equilibrio";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: randomUUID(),
        username: 'agustin',
        email: 'agustin@equilibrio.app',
        passwordHash: bcrypt.hashSync('123456', 10),
        displayName: 'Agustin',
        createdAt: new Date()
      }
    });
    console.log('Created default user: agustin / 123456');
  } else {
    console.log('User already exists:', user.username);
    
    // Check if password works, if not update it
    const match = bcrypt.compareSync('123456', user.passwordHash);
    if (!match) {
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: bcrypt.hashSync('123456', 10) }
        });
        console.log(`Updated password for ${user.username} to 123456`);
    } else {
        console.log(`Password for ${user.username} is 123456`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
