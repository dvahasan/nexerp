// Central export for all Mongoose models.
// Import from here: const { Company, User, Item } = require("../models");

const Company     = require("./Company");
const Department  = require("./Department");
const Category    = require("./Category");
const User        = require("./User");
const Item        = require("./Item");
const Transaction = require("./Transaction");
const Setting     = require("./Setting");
const File        = require("./File");

module.exports = { Company, Department, Category, User, Item, Transaction, Setting, File };
