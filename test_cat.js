const mongoose = require("mongoose");
const { Category, Company, Department } = require("./backend/models");
const connectDB = require("./backend/config/db");

async function test() {
  await connectDB();
  const company = await Company.findOne();
  const dept = await Department.findOne();

  console.log("Testing with parentId: ''");
  try {
    const c1 = await Category.create({
      name: "Test 1",
      companyId: company._id,
      deptId: dept._id,
      parentId: ""
    });
    console.log("Success c1", c1._id);
  } catch (e) {
    console.error("Error c1:", e.message);
  }

  console.log("Testing with parentId: null");
  try {
    const c2 = await Category.create({
      name: "Test 2",
      companyId: company._id,
      deptId: dept._id,
      parentId: null
    });
    console.log("Success c2", c2._id);
  } catch (e) {
    console.error("Error c2:", e.message);
  }
  
  process.exit(0);
}
test();
