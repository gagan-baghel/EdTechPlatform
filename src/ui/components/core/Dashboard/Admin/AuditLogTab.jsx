"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { Table, Tbody, Td, Th, Thead, Tr } from "react-super-responsive-table"

import { fetchAuditLog } from "../../../../services/operations/adminAPI"
import { formatDate } from "../../../../services/formatDate"
import Spinner from "../../../common/Spinner"

export default function AuditLogTab() {
  const { token } = useSelector((state) => state.auth)
  const [entries, setEntries] = useState(null)

  useEffect(() => {
    ;(async () => {
      const result = await fetchAuditLog(token, { limit: 50 })
      if (result) setEntries(result.data)
    })()
  }, [token])

  if (!entries) return <Spinner />
  if (entries.length === 0) return <p className="text-richblack-300">No audit entries yet.</p>

  return (
    <Table className="rounded-md border border-richblack-700">
      <Thead>
        <Tr className="border-b border-richblack-700 text-left text-richblack-50">
          <Th className="px-4 py-3">When</Th>
          <Th className="px-4 py-3">Admin</Th>
          <Th className="px-4 py-3">Action</Th>
          <Th className="px-4 py-3">Target</Th>
          <Th className="px-4 py-3">Details</Th>
        </Tr>
      </Thead>
      <Tbody>
        {entries.map((entry) => (
          <Tr key={entry._id} className="border-b border-richblack-800 text-richblack-100">
            <Td className="px-4 py-3">{formatDate(entry.timestamp)}</Td>
            <Td className="px-4 py-3">
              {entry.actor?.firstName} {entry.actor?.lastName}
            </Td>
            <Td className="px-4 py-3">{entry.action}</Td>
            <Td className="px-4 py-3">
              {entry.targetType} {String(entry.targetId ?? "")}
            </Td>
            <Td className="px-4 py-3 max-w-xs truncate">{JSON.stringify(entry.details)}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}
