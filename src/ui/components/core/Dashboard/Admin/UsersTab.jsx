"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { Table, Tbody, Td, Th, Thead, Tr } from "react-super-responsive-table"

import { fetchUsers, setUserActive } from "../../../../services/operations/adminAPI"
import ConfirmationModal from "../../../common/ConfirmationModal"
import Spinner from "../../../common/Spinner"

export default function UsersTab() {
  const { token } = useSelector((state) => state.auth)
  const [users, setUsers] = useState(null)
  const [q, setQ] = useState("")
  const [confirmationModal, setConfirmationModal] = useState(null)

  const load = async (query = "") => {
    const result = await fetchUsers(token, query ? { q: query } : {})
    if (result) setUsers(result.data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggleActive = async (user) => {
    const nextActive = user.active === false
    await setUserActive(token, user._id, nextActive)
    await load(q)
    setConfirmationModal(null)
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          load(q)
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email"
          className="form-style w-full max-w-sm"
        />
        <button type="submit" className="rounded-md bg-yellow-50 px-4 py-2 font-semibold text-richblack-900">
          Search
        </button>
      </form>

      {!users ? (
        <Spinner />
      ) : users.length === 0 ? (
        <p className="text-richblack-300">No users found.</p>
      ) : (
        <Table className="rounded-md border border-richblack-700">
          <Thead>
            <Tr className="border-b border-richblack-700 text-left text-richblack-50">
              <Th className="px-4 py-3">Name</Th>
              <Th className="px-4 py-3">Email</Th>
              <Th className="px-4 py-3">Role</Th>
              <Th className="px-4 py-3">Status</Th>
              <Th className="px-4 py-3">Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.map((user) => (
              <Tr key={user._id} className="border-b border-richblack-800 text-richblack-100">
                <Td className="px-4 py-3">{user.firstName} {user.lastName}</Td>
                <Td className="px-4 py-3">{user.email}</Td>
                <Td className="px-4 py-3">{user.accountType}</Td>
                <Td className="px-4 py-3">
                  <span className={user.active === false ? "text-pink-200" : "text-caribbeangreen-100"}>
                    {user.active === false ? "Suspended" : "Active"}
                  </span>
                </Td>
                <Td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmationModal({
                        text1: user.active === false ? "Reactivate this user?" : "Suspend this user?",
                        text2:
                          user.active === false
                            ? "They will be able to log in again."
                            : "They will not be able to log in until reactivated.",
                        btn1Text: "Confirm",
                        btn2Text: "Cancel",
                        btn1Handler: () => handleToggleActive(user),
                        btn2Handler: () => setConfirmationModal(null),
                      })
                    }
                    className="text-sm font-semibold text-yellow-50 underline"
                  >
                    {user.active === false ? "Reactivate" : "Suspend"}
                  </button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </div>
  )
}
