import { toast } from "react-hot-toast";
import { studentEndpoints } from "../apis";
import { apiConnector } from "../apiconnector";
import { setPaymentLoading } from "../../slices/courseSlice";
import { resetCart } from "../../slices/cartSlice";

const {COURSE_PAYMENT_API, COURSE_VERIFY_API, SEND_PAYMENT_SUCCESS_EMAIL_API,CREATE_PAYMENT_ENTRY} = studentEndpoints;
const RAZORPAY_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_RAZORPAY_KEY || "rzp_test_zAk8u0iXMKzjyC"

let razorpayScriptPromise = null

function loadScript(src) {
    if (typeof window !== "undefined" && window.Razorpay) {
        return Promise.resolve(true)
    }

    if (razorpayScriptPromise) {
        return razorpayScriptPromise
    }

    razorpayScriptPromise = new Promise((resolve) => {
        const existingScript = document.querySelector(`script[src="${src}"]`)

        if (existingScript) {
            existingScript.addEventListener("load", () => resolve(true), { once: true })
            existingScript.addEventListener("error", () => resolve(false), { once: true })
            return
        }

        const script = document.createElement("script");
        script.src = src;

        script.onload = () => {
            resolve(true);
        }
        script.onerror= () =>{
            resolve(false);
        }
        document.body.appendChild(script);
    }).finally(() => {
        razorpayScriptPromise = null
    })

    return razorpayScriptPromise
}


export async function buyCourse(token, courses, userDetails, navigate, dispatch) {
    const toastId = toast.loading("Initiating payment...");
    try{
        //load the script
        const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");

        if(!res) {
            toast.error("RazorPay SDK failed to load");
            return;
        }

        //initiate the order
        
        const orderResponse = await apiConnector("POST", COURSE_PAYMENT_API, 
                                {courses},
                                {
                                    Authorization: `Bearer ${token}`,
                                })


        if(!orderResponse.data.success) {
            throw new Error(orderResponse.data.message);
        }
        //options
        const options = {
            key: RAZORPAY_PUBLIC_KEY,
            currency: orderResponse.data.message.currency,
            amount: `${orderResponse.data.message.amount}`,
            order_id:orderResponse.data.message.id,
            name:"StudyNotion",
            description: "Thank You for Purchasing the Course",
            image:"/logo.png",
            prefill: {
                name:`${userDetails.firstName}`,
                email:userDetails.email
            },
            handler: function(response) {
                //send successful wala mail
                sendPaymentSuccessEmail(response, orderResponse.data.message.amount,token );

                //verifyPayment
                createPaymentEntry(response,orderResponse.data.message.amount,courses,token);

                verifyPayment({...response, courses}, token, navigate, dispatch);
            }
        }
        const paymentObject = new window.Razorpay(options);

        paymentObject.open();
        paymentObject.on("payment.failed", function(response) {
            toast.error("oops, payment failed");
        })

    }
    catch(_error) {
        toast.error("Could not make Payment....");
    }
    toast.dismiss(toastId);
}

async function createPaymentEntry(response,amount,courses,token){

    try{
        await apiConnector("POST", CREATE_PAYMENT_ENTRY, {
            
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            amount,
            courses

        },{
            Authorization: `Bearer ${token}`
        })
    }
    catch(_error) {
    }

}

async function sendPaymentSuccessEmail(response, amount, token) {
    try{
        await apiConnector("POST", SEND_PAYMENT_SUCCESS_EMAIL_API, {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            amount,
        },{
            Authorization: `Bearer ${token}`
        })
    }
    catch(_error) {
    }
}

//verify payment
async function verifyPayment(bodyData, token, navigate, dispatch) {
    const toastId = toast.loading("Verifying Payment....");
    dispatch(setPaymentLoading(true));
    try{
        const response  = await apiConnector("POST", COURSE_VERIFY_API, bodyData, {
            Authorization:`Bearer ${token}`,
        })

        if (response.data.success !== true) {
            throw new Error(response.data.message);
        }
        toast.success("payment Successful, ypou are addded to the course");
        navigate("/dashboard/enrolled-courses");
        dispatch(resetCart());
    }   
    catch(error) {
        toast.error("Could not verify Payment");
    }
    toast.dismiss(toastId);
    dispatch(setPaymentLoading(false));
}
