import React, { useEffect, useState } from 'react'
import { apiConnector } from '../../../services/apiconnector';
import { studentEndpoints } from '../../../services/apis';
import { useSelector } from "react-redux"
import { Table, Tbody, Td, Th, Thead, Tr } from "react-super-responsive-table"
import { formatDate } from '../../../services/formatDate';
export default function StudentPurchaes() {

  const { token } = useSelector((state) => state.auth)

  const [paymentHistory,setPaymentHistory] = useState([])

  const getPaymentHistory = async () => {
    try {
      const responsePaymentHistory = await apiConnector("GET", studentEndpoints.GET_PAYMENT_HISTORY,null,{
        Authorization: `Bearer ${token}`,
      });

      setPaymentHistory(responsePaymentHistory.data.paymentEntries)

      console.log(paymentHistory)
    } catch (error) {
      console.log("Could not fetch payments")
    }
  };
 

  useEffect(()=>{
    getPaymentHistory()
  },[])


  return (
    <>
    <div className="text-3xl text-richblack-50">Payment History</div>

    <Table className="border border-richblack-800 rounded-t-xl my-8">
          <Thead >
            <Tr className=" border-b border-b-richblack-800  text-center  bg-richblack-500 rounded-t-xl overflow-hidden">
              
              <Th className="text-left text-sm font-medium uppercase text-richblack-100 px-6 py-4 ">
                Date
              </Th>

              <Th className="text-left text-sm font-medium uppercase text-richblack-100 px-6 py-4">
                OrderID
              </Th>

              <Th className="text-left text-sm font-medium uppercase text-richblack-100 px-6 py-4">
                PaymentId
              </Th>

              <Th className="text-left text-sm font-medium uppercase text-richblack-100 px-6 py-4">
                Total Amount
              </Th>
              <Th className="text-left text-sm font-medium uppercase text-richblack-100 px-6 py-4">
                Courses
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {paymentHistory?.length === 0 ? (
                    <Tr>
                      <Td className="py-10 text-center text-2xl font-medium text-richblack-100">
                        No Payments found
                      </Td>
                    </Tr>
                  ) : (paymentHistory.map((payment)=>(
                    <Tr className="border border-richblack-500" key={payment._id}>

                        <Td className="text-sm font-medium text-richblack-100 px-6 py-2 ">{formatDate(payment.date)} </Td>
                      
                        <Td className="text-sm font-medium text-richblack-100 px-6 py-2 ">{payment.orderId}</Td>
                    
                        <Td className="text-sm font-medium text-richblack-100 px-6 py-2 ">{payment.paymentId}</Td>

                        <Td className="text-sm font-medium text-richblack-100 px-6 py-2 ">{payment.amount}</Td>

                        <Td className="text-sm font-medium text-richblack-100 px-6 py-2 ">
                          {
                          payment?.courses.map((course)=>(
                            <>
                              <br/>
                              <hr />
                              <Td>
                                {course.courseName}
                              </Td>
                              <hr />
                              <br/>


                            </>
                          ))
                          }
                        </Td>

                    </Tr>
                  )))
            }
          </Tbody>
    </Table>

    </>
  )
}
