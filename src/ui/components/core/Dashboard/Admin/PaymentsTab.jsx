"use client"

import { useState } from "react"
import { useSelector } from "react-redux"
import { Table, Tbody, Td, Th, Thead, Tr } from "react-super-responsive-table"

import { fetchPayments, fetchOrders } from "../../../../services/operations/adminAPI"
import { formatCurrency } from "../../../../utils/formatCurrency"
import { formatDate } from "../../../../services/formatDate"

export default function PaymentsTab() {
  const { token } = useSelector((state) => state.auth)
  const [orderId, setOrderId] = useState("")
  const [email, setEmail] = useState("")
  const [payments, setPayments] = useState(null)
  const [orders, setOrders] = useState(null)

  const handleLookup = async (e) => {
    e.preventDefault()
    const params = {}
    if (orderId) params.orderId = orderId
    if (email) params.email = email

    const [paymentResult, orderResult] = await Promise.all([
      fetchPayments(token, params),
      fetchOrders(token, orderId ? { orderId } : {}),
    ])
    if (paymentResult) setPayments(paymentResult.data)
    if (orderResult) setOrders(orderResult.data)
  }

  return (
    <div>
      <form onSubmit={handleLookup} className="mb-6 flex flex-wrap gap-2">
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Razorpay order id"
          className="form-style"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Customer email"
          className="form-style"
        />
        <button type="submit" className="rounded-md bg-yellow-50 px-4 py-2 font-semibold text-richblack-900">
          Look up
        </button>
      </form>

      <h2 className="mb-3 text-lg font-semibold text-richblack-5">Payments</h2>
      {!payments ? (
        <p className="mb-8 text-richblack-300">Search by order id or email to see results.</p>
      ) : payments.length === 0 ? (
        <p className="mb-8 text-richblack-300">No payments found.</p>
      ) : (
        <Table className="mb-8 rounded-md border border-richblack-700">
          <Thead>
            <Tr className="border-b border-richblack-700 text-left text-richblack-50">
              <Th className="px-4 py-3">Date</Th>
              <Th className="px-4 py-3">Customer</Th>
              <Th className="px-4 py-3">Order ID</Th>
              <Th className="px-4 py-3">Payment ID</Th>
              <Th className="px-4 py-3">Amount</Th>
              <Th className="px-4 py-3">Courses</Th>
            </Tr>
          </Thead>
          <Tbody>
            {payments.map((payment) => (
              <Tr key={payment._id} className="border-b border-richblack-800 text-richblack-100">
                <Td className="px-4 py-3">{formatDate(payment.date)}</Td>
                <Td className="px-4 py-3">
                  {payment.consumer?.firstName} {payment.consumer?.lastName} ({payment.consumer?.email})
                </Td>
                <Td className="px-4 py-3">{payment.orderId}</Td>
                <Td className="px-4 py-3">{payment.paymentId}</Td>
                <Td className="px-4 py-3">{formatCurrency(payment.amount)}</Td>
                <Td className="px-4 py-3">{payment.courses?.map((c) => c.courseName).join(", ")}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <h2 className="mb-3 text-lg font-semibold text-richblack-5">Orders</h2>
      {!orders ? (
        <p className="text-richblack-300">Enter an order id to look up the underlying order.</p>
      ) : orders.length === 0 ? (
        <p className="text-richblack-300">No orders found.</p>
      ) : (
        <Table className="rounded-md border border-richblack-700">
          <Thead>
            <Tr className="border-b border-richblack-700 text-left text-richblack-50">
              <Th className="px-4 py-3">Order ID</Th>
              <Th className="px-4 py-3">Customer</Th>
              <Th className="px-4 py-3">Status</Th>
              <Th className="px-4 py-3">Amount</Th>
              <Th className="px-4 py-3">Created</Th>
            </Tr>
          </Thead>
          <Tbody>
            {orders.map((order) => (
              <Tr key={order._id} className="border-b border-richblack-800 text-richblack-100">
                <Td className="px-4 py-3">{order.orderId}</Td>
                <Td className="px-4 py-3">
                  {order.user?.firstName} {order.user?.lastName} ({order.user?.email})
                </Td>
                <Td className="px-4 py-3">
                  <span className={order.status === "paid" ? "text-caribbeangreen-100" : "text-yellow-50"}>
                    {order.status}
                  </span>
                </Td>
                <Td className="px-4 py-3">{formatCurrency(order.amount / 100)}</Td>
                <Td className="px-4 py-3">{formatDate(order.createdAt)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
