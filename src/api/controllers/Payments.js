const {instance} = require("../config/razorpay");
const Course = require("../models/Course");
const Payment = require("../models/Payment");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const {courseEnrollmentEmail} = require("../mail/templates/courseEnrollmentEmail");
const { default: mongoose } = require("mongoose");
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail");
const crypto = require("crypto");
const CourseProgress = require("../models/CourseProgress");

exports.capturePayment = async(req, res) => {

    const {courses} = req.body;
    const userId = req.user.id;

    if(!Array.isArray(courses) || courses.length === 0) {
        return res.status(400).json({success:false, message:"Please provide Course Ids"});
    }

    let totalAmount = 0;

    for(const course_id of courses) {
        let course;
        try{
           
            course = await Course.findById(course_id);
            if(!course) {
                return res.status(404).json({success:false, message:"Could not find the course"});
            }

            const uid  = new mongoose.Types.ObjectId(userId);

            if(course.studentsEnrolled.includes(uid)) {
                return res.status(400).json({success:false, message:"Student is already Enrolled"});
            }

            totalAmount += course.price;
        }
        catch(error) {
            return res.status(500).json({success:false, message:error.message});
        }
    }
    const currency = "INR";
    const options = {
        amount: totalAmount * 100,
        currency,
        receipt: Math.random(Date.now()).toString(),
    } 

    try{
        const paymentResponse = await instance.orders.create(options);
        res.json({
            success:true,
            message:paymentResponse,
        })
    }
    catch(error) {
        return res.status(500).json({success:false, mesage:"Could not Initiate Order"});
    }

}

exports.verifyPayment = async(req, res) => {
    const razorpay_order_id = req.body?.razorpay_order_id;
    const razorpay_payment_id = req.body?.razorpay_payment_id;
    const razorpay_signature = req.body?.razorpay_signature;
    const courses = req.body?.courses;
    const userId = req.user.id;

    if(!razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature || !courses || !userId) {
            return res.status(400).json({success:false, message:"Payment Failed"});
    }

    let body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body.toString())
        .digest("hex");

    if(expectedSignature === razorpay_signature) {
        try {
            //enroll karwao student ko
            await enrollStudents(courses, userId);
            return res.status(200).json({success:true, message:"Payment Verified"});
        } catch (error) {
            return res.status(500).json({success:false, message:error.message});
        }
    }
    return res.status(200).json({success:false, message:"Payment Failed"});

}

const enrollStudents = async(courses, userId) => {

    if(!courses || !userId) {
        throw new Error("Please Provide data for Courses or UserId");
    }

    for(const courseId of courses) {
        try{
            //find the course and enroll the student in it
        const enrolledCourse = await Course.findOneAndUpdate(
            {_id:courseId},
            {$addToSet:{studentsEnrolled:userId}},
            {new:true},
        )


        if(!enrolledCourse) {
            throw new Error("Course not Found");
        }

        const courseProgress = await CourseProgress.create({
            courseID:courseId,
            userId:userId,
            completedVideos: [],
        })

        //find the student and add the course to their list of enrolledCOurses
        const enrolledStudent = await User.findByIdAndUpdate(userId,
            {$addToSet:{
                courses: courseId,
                courseProgress: courseProgress._id,
            }},{new:true})
        if (!enrolledStudent) {
            throw new Error("User not found");
        }
            
        ///bachhe ko mail send kardo
        const emailResponse = await mailSender(
            enrolledStudent.email,
            `Successfully Enrolled into ${enrolledCourse.courseName}`,
            courseEnrollmentEmail(enrolledCourse.courseName, `${enrolledStudent.firstName}`)
        )    
        //console.log("Email Sent Successfully", emailResponse.response);
        }
        catch(error) {
            throw error;
        }
    }

}

exports.sendPaymentSuccessEmail = async(req, res) => {
    const {orderId, paymentId, amount} = req.body;

    const userId = req.user.id;

    if(!orderId || !paymentId || !amount || !userId) {
        return res.status(400).json({success:false, message:"Please provide all the fields"});
    }

    try{
        //student ko dhundo
        const enrolledStudent = await User.findById(userId);
        if (!enrolledStudent) {
            return res.status(404).json({success:false, message:"User not found"})
        }
        await mailSender(
            enrolledStudent.email,
            `Payment Recieved`,
             paymentSuccessEmail(`${enrolledStudent.firstName}`,
             amount/100,orderId, paymentId)
        )
        return res.status(200).json({success:true, message:"Payment success email sent"})
    }
    catch(error) {
        return res.status(500).json({success:false, message:"Could not send email"})
    }
}

exports.createPaymentEntry = async(req,res)=>{
    const {orderId, paymentId, amount, courses} = req.body;
    const {id} = req.user;
    if (!orderId || !paymentId || !amount || !Array.isArray(courses)) {
        return res.status(400).json({success:false, message:"Missing payment details"})
    }
    try{
        const newPayment = await Payment.create({
            consumer:id,
            courses,
            orderId,
            paymentId,
            amount:amount/100
        })
        return res.status(201).json({success:true, message:"created payment entry"})
        
    }catch(error){

        return res.status(500).json({success:false, message:"error while creating payment entry"})
    }    
}

exports.getUserPaymentEntries = async(req,res)=>{
    const {id} = req.user;
    
    try{

        const paymentEntries = await Payment.find({
            consumer: id
        }).populate({
            path: 'courses',
            select: 'courseName'
        });

        if(!paymentEntries || paymentEntries.length === 0){
            return res.status(200).json({success:true, paymentEntries: []})
        }
        return res.status(200).json({success:true,paymentEntries})
        
    }catch(error){

        return res.status(500).json({success:false, message:"error while fetching payment entry"})
    }    

}
