require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ username: 'ent_owner' });
  const comps = await db.collection('companies').find({ _id: { $in: user.ownedCompanies } }).toArray();
  console.log('comps found:', comps.length);
  process.exit(0);
});
