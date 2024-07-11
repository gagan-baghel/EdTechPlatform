const nodeMailer = require("nodemailer")
require("dotenv").config()


const mailSender = async(email,title,body)=>{
    try{
        const transporter = nodeMailer.createTransport({
            host: 'smtp.gmail.com',
            auth: {
              user: 'gaganpythonproject@gmail.com',
              pass: 'swmpmuxvpsetimpf',
            },
          });
          
        let info = await transporter.sendMail({
            from:'gaganpythonproject@gmail.com',
            to:email,
            subject:title,
            html:`<h1>${body}</h1>`
        })
        return info
    }
    catch(error){
        console.log("nodemail config error from mailsender",error)
    }
}

module.exports = mailSender;