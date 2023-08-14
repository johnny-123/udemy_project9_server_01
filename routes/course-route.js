const { course } = require("../models");
const { findOneAndUpdate, validate } = require("../models/user-model");

const router = require("express").Router();
const Course = require("../models").course;
const courseValidation = require("../validation").courseValidation;

router.use((req, res, next) => {
  console.log("course router正在接受一個requset...");
  next();
});

router.get("/", async (req, res) => {
  try {
    let foundCourse = await Course.find({})
      .populate("instructor", ["username", "email"])
      .exec();
    return res.send(foundCourse);
  } catch (e) {
    return res.status(500).send(e);
  }
});

router.get("/findByName/:name", async (req, res) => {
  let { name } = req.params;
  try {
    let userID = req.user._id.toString();
    let foundCourse = await Course.find({
      $and: [
        { title: { $regex: name } },
        {
          students: {
            $ne: userID,
          },
        },
      ],
    })
      .populate("instructor", ["username,email"])
      .exec();
    console.log(userID);
    console.log(foundCourse);
    // let showFoundCourse = []
    // for(let i = 0;i < foundCourse.length;i++){
    //   if(foundCourse[0].students)
    // }
    return res.send(foundCourse);
  } catch (e) {
    return res.status(500).send(e);
  }
});

router.get("/:_id", async (req, res) => {
  let { _id } = req.params;
  try {
    let foundCourse = await Course.findOne({ _id })
      .populate("instructor", ["username,email"])
      .exec();
    return res.send(foundCourse);
  } catch (e) {
    return res.status(500).send(e);
  }
});

router.get("/student/:_student_id", async (req, res) => {
  let { _student_id } = req.params;
  try {
    let foundCourse = await Course.find({ students: _student_id })
      .populate("instructor", ["username,email"])
      .exec();
    return res.send(foundCourse);
  } catch (e) {
    return res.status(500).send(e);
  }
});

router.get("/instructor/:_instructor_id", async (req, res) => {
  let { _instructor_id } = req.params;
  try {
    let foundCourse = await Course.find({ instructor: _instructor_id })
      .populate("instructor", ["username,email"])
      .exec();
    return res.send(foundCourse);
  } catch (e) {
    return res.status(500).send(e);
  }
});

router.post("/", async (req, res) => {
  let { error } = courseValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  if (req.user.isStudent())
    return res
      .status(400)
      .send("只有instructor可以發布新課程，若你已經是，請透instructor帳號登入");
  let { title, description, price } = req.body;
  try {
    let newCourse = new Course({
      title,
      description,
      price,
      instructor: req.user._id,
    });
    let savedCourse = await newCourse.save();
    return res.send({
      msg: "課程已被保存",
      savedCourse,
    });
  } catch (e) {
    return res.status(500).send("無法創建該課程");
  }
});

router.post("/enroll/:_id", async (req, res) => {
  let { _id } = req.params;
  try {
    let course = await Course.findOne({ _id }).exec();
    course.students.push(req.user._id);
    course.save();
    return res.send("註冊" + course.title + "成功");
  } catch (e) {
    return res.status(500).send(e);
  }
});

router.patch("/:_id", async (req, res) => {
  let { error } = courseValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  // console.log("顯示param:");
  // console.log(req.params);
  // console.log(req.params._id);
  try {
    let foundCourse = await Course.findOne({ _id: req.params._id }).exec();
    console.log("顯示找到的課程內容:");
    console.log(foundCourse);
    if (!foundCourse) {
      return res.status(400).send("該課程不存在");
    }

    if (foundCourse.instructor.equals(req.user._id)) {
      console.log(req.body);
      let { title, description, price } = req.body;
      let updateCourse = await Course.findOneAndUpdate(
        { _id: req.params._id },
        { title, description, price },
        {
          new: true,
          runValidator: true,
        }
      ).exec();
      return res.send({ msg: "課程更新成功", updateCourse });
    } else {
      return res.status(403).send("只有此課程的講師才能編輯課程。");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

router.patch("/student/:_id", async (req, res) => {
  let { _id } = req.params;
  // 確認課程存在
  try {
    let courseFound = await Course.findOne({ _id }).exec();
    if (!courseFound) {
      return res.status(400).send("找不到課程。無法退出該課程。");
    }
    // 使用者必須有註冊該課程才可退出
    let newStudentList = [];
    console.log(courseFound.students.length);
    for (let i = 0; i < courseFound.students.length; i++) {
      if (courseFound.students[i] === req.user._id.toString()) {
        console.log("要移除的學生ID為:" + req.user._id);
      } else {
        newStudentList.push(courseFound.students[i]);
      }
    }
    console.log(newStudentList);
    let updateCourse = await Course.findOneAndUpdate(
      { _id },
      { students: newStudentList },
      {
        new: true,
        runValidator: true,
      }
    ).exec();
    return res.send({ msg: "課程更新成功", updateCourse });
  } catch (e) {
    return res.status(500).send(e);
  }
});

router.delete("/:_id", async (req, res) => {
  let { _id } = req.params;
  // 確認課程存在
  try {
    let courseFound = await Course.findOne({ _id }).exec();
    if (!courseFound) {
      return res.status(400).send("找不到課程。無法刪除課程。");
    }

    // 使用者必須是此課程講師，才能刪除課程
    if (courseFound.instructor.equals(req.user._id)) {
      await Course.deleteOne({ _id }).exec();
      return res.send("課程已被刪除。");
    } else {
      return res.status(403).send("只有此課程的講師才能刪除課程。");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

module.exports = router;
