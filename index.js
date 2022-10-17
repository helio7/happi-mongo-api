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
      path: '/rate-with-mark-up-fee',
      handler: async (request, h) => {
         const { rates: { ARS, BRL, USD } } = await fetch(
            `${FIXER_API_BASE_URL}/latest?access_key=${FIXER_API_ACCESS_KEY}&symbols=ARS,BRL,USD`,
         )
            .then(res => res.json());

         const rates = {
            'EUR/ARS': ARS,
            'EUR/BRL': BRL,
            'EUR/USD': USD,
         };

         console.log('AAAAAAAAAAAA');
         console.log(rates);
         return rates;
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
