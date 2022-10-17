import Hapi from '@hapi/hapi';
import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';
import fetch from 'node-fetch';

dotenv.config();

const init = async () => {
   const {
      MONGODB_USERNAME,
      MONGODB_PASSWORD,
      MONGODB_CLUSTER_HOST,
      FIXER_API_BASE_URL,
      FIXER_API_ACCESS_KEY,
   } = process.env;

   const client = new MongoClient(
      `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER_HOST}/?retryWrites=true&w=majority`,
      { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 }
   );

   await client.connect()
      .catch((err) => {
         console.log(`Couldn't connect to the MongoDB database.`);
         console.log(err);
      });

   const collection = client.db('initial_test_db').collection('initial_test_collection');

   const server = Hapi.server({
      port: 3000,
      host: 'localhost',
   });

   server.route({
      method: 'GET',
      path: '/',
      handler: async (request, h) => {
         await collection.insertOne({
            uuid: nanoid(),
         });
         return 'Hello world!';
      },
   });

   server.route({
      method: 'GET',
      path: '/rates-with-mark-up-fee-applied',
      handler: async (request, h) => {
         const { rates: { ARS, BRL, USD } } = await fetch(
            `${FIXER_API_BASE_URL}/latest?access_key=${FIXER_API_ACCESS_KEY}&symbols=ARS,BRL,USD`,
         )
            .then(res => res.json());

         const fxRates = {
            'EUR/ARS': { originalRate: ARS },
            'EUR/BRL': { originalRate: BRL },
            'EUR/USD': { originalRate: USD },
            'USD/ARS': { originalRate: ARS / USD },
            'USD/BRL': { originalRate: BRL / USD },
            'BRL/ARS': { originalRate: ARS / BRL },
         };

         const fee = Number(request.query.feePercent) / 100;

         for (const pair in fxRates) {
            if (Object.prototype.hasOwnProperty.call(fxRates, pair)) {
               const { originalRate } = fxRates[pair];
               fxRates[pair].feePercent = fee * 100;
               const marketRateWithFeeApplied = calculateMarketRateWithFee(originalRate, fee);
               fxRates[pair].rateWithMarkupFeeApplied = marketRateWithFeeApplied;
               fxRates[pair].feeAmount = marketRateWithFeeApplied - originalRate;
            }
         }

         return fxRates;
      },
   })

   await server.start();
   console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
   console.log(err);
   process.exit(1);
});

init();

function calculateMarketRateWithFee(rate, fee) {
   return rate * (fee + 1);
}
