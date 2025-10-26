hng-backend-stage2
==================

HNG Backend Stage 2 Task
------------------------

Overview
--------
This project implements the Stage 2 backend task for the HNG Internship.
It provides a Country and Exchange Rates API that can: Done and accomplished with Nestjs{Node.js/Express}

- Refresh and store countries and exchange rates from external APIs.
- Generate a summary image of top GDP countries.
- Allow CRUD operations on countries.
- Provide a global status endpoint.

Endpoints
---------

POST /countries/refresh
    Refresh all countries and exchange rates.
    Upserts data into the database and regenerates the summary image.

GET /countries
    Get all countries. Supports query parameters:
    - region: filter by region
    - currency: filter by currency code
    - sort: gdp_desc or gdp_asc

GET /countries/image
    Get the summary image (top GDP countries).

GET /status
    Get the total number of countries and last refresh timestamp.

GET /countries/:name
    Get a single country by name.

DELETE /countries/:name
    Delete a country by name.

How to Run Locally
------------------

# Clone repository
git clone https://github.com/Owolabi5541/hng-backend-stage2.git
cd hng-backend-stage2

# Install dependencies
pnpm install

# Create .env file
# Add the following environment variables:
PORT=3000
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DB_NAME
COUNTRIES_API=<Countries API URL>
EXCHANGE_API=<Exchange Rates API URL>
IMAGE_CACHE_PATH=./cache/summary.png

# Run Prisma migrations (if database empty)
npx prisma migrate dev --name init

# Start the server
pnpm start:dev

Server runs at:
http://localhost:3000



#================ Prisma Commands =================
#to view database ER diagram
#pnpm prisma studio
#Prisma Studio is up on http://localhost:5555