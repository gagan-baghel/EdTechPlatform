import type { ApiFailure } from "@/types/api"
import React, { useCallback, useEffect, useState } from "react"
import { apiConnector } from "../../../services/apiconnector"
import { studentEndpoints } from "../../../services/apis"
import { useSelector } from "react-redux"
import { Table, Tbody, Td, Th, Thead, Tr } from "react-super-responsive-table"
import { formatDate } from "../../../services/formatDate"
import Spinner from "../../common/Spinner"
import type { RootState } from "../../../store"

/** A payment row on the purchase-history screen. */
interface PurchaseRecord {
  _id: string
  date: string
  orderId: string
  paymentId: string
  amount: number
  courses?: { _id?: string; courseName: string }[]
}

export default function StudentPurchaes() {
  const { token } = useSelector((state: RootState) => state.auth)
  const [paymentHistory, setPaymentHistory] = useState<PurchaseRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [prevToken, setPrevToken] = useState(token)
  if (token !== prevToken) {
    setPrevToken(token)
    if (token) {
      setLoading(true)
    } else {
      setLoading(false)
      setPaymentHistory([])
    }
  }

  const getPaymentHistory = useCallback(() => {
    if (!token) return

    apiConnector<
      { success: true; paymentEntries: PurchaseRecord[] } | ApiFailure
    >("GET", studentEndpoints.GET_PAYMENT_HISTORY, null, {
      Authorization: `Bearer ${token}`,
    })
      .then((responsePaymentHistory) => {
        setPaymentHistory(
          responsePaymentHistory.data.success
            ? responsePaymentHistory.data.paymentEntries
            : []
        )
      })
      .catch(() => {
        setPaymentHistory([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  useEffect(() => {
    if (token && loading) {
      getPaymentHistory()
    }
  }, [getPaymentHistory, token, loading])

  return (
    <>
      <div className="text-3xl text-richblack-50">Payment History</div>

      {loading ? (
        <div className="grid min-h-[260px] place-items-center">
          <Spinner />
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
