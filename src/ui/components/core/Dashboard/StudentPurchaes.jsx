import React, { useCallback, useEffect, useState } from "react"
import { apiConnector } from "../../../services/apiconnector"
import { studentEndpoints } from "../../../services/apis"
import { useSelector } from "react-redux"
import { Table, Tbody, Td, Th, Thead, Tr } from "react-super-responsive-table"
import { formatDate } from "../../../services/formatDate"
export default function StudentPurchaes() {
  const { token } = useSelector((state) => state.auth)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const getPaymentHistory = useCallback(async () => {
    if (!token) {
      setPaymentHistory([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const responsePaymentHistory = await apiConnector("GET", studentEndpoints.GET_PAYMENT_HISTORY, null, {
        Authorization: `Bearer ${token}`,
      })
      setPaymentHistory(responsePaymentHistory?.data?.paymentEntries || [])
    } catch (_error) {
      setPaymentHistory([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    getPaymentHistory()
  }, [getPaymentHistory])

  return (
    <>
      <div className="text-3xl text-richblack-50">Payment History</div>

      {loading ? (
        <div className="grid min-h-[260px] place-items-center">
          <div className="spinner"></div>
        </div>
      ) : (
        <Table className="my-8 rounded-t-xl border border-richblack-800">
          <Thead>
            <Tr className="overflow-hidden rounded-t-xl border-b border-b-richblack-800 bg-richblack-500 text-center">
              <Th className="px-6 py-4 text-left text-sm font-medium uppercase text-richblack-100">
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
            ) : (
              paymentHistory.map((payment) => (
                <Tr className="border border-richblack-500" key={payment._id}>
                  <Td className="px-6 py-2 text-sm font-medium text-richblack-100">
                    {formatDate(payment.date)}
                  </Td>

                  <Td className="px-6 py-2 text-sm font-medium text-richblack-100">
                    {payment.orderId}
                  </Td>

                  <Td className="px-6 py-2 text-sm font-medium text-richblack-100">
                    {payment.paymentId}
                  </Td>

                  <Td className="px-6 py-2 text-sm font-medium text-richblack-100">
                    {payment.amount}
                  </Td>

                  <Td className="px-6 py-2 text-sm font-medium text-richblack-100">
                    <div className="flex flex-col gap-2">
                      {payment?.courses?.map((course) => (
                        <span key={`${payment._id}-${course._id || course.courseName}`}>
                          {course.courseName}
                        </span>
                      ))}
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      )}
    </>
  )
}
