Typical development workflow

Example order:

npx prisma migrate dev
npx prisma generate
npm run db:seed
npm run dev

Step-by-step:

1️⃣ Create/update database schema
2️⃣ Generate Prisma client
3️⃣ Populate database with test data
4️⃣ Run app