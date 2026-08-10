import { ACCOUNT_TYPE } from "../utils/constants";
export const sidebarLinks = [
  {
    id: 1,
    name: "My Profile",
    path: "/dashboard/my-profile",
    icon: "VscAccount",
  },
  {
    id: 2,
    name: "Dashboard",
    path: "/dashboard/instructor",
    type: ACCOUNT_TYPE.INSTRUCTOR,
    icon: "VscDashboard",
  },
  {
    id: 3,
    name: "My Courses",
    path: "/dashboard/my-courses",
    type: ACCOUNT_TYPE.INSTRUCTOR,
    icon: "VscVm",
  },
  {
    id: 4,
    name: "Add Course",
    path: "/dashboard/add-course",
    type: ACCOUNT_TYPE.INSTRUCTOR,
    icon: "VscAdd",
  },
  {
    id: 8,
    name: "Payouts",
    path: "/dashboard/payouts",
    type: ACCOUNT_TYPE.INSTRUCTOR,
    icon: "VscCreditCard",
  },
  {
    id: 9,
    name: "My Learning",
    path: "/dashboard/my-learning",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscGraph",
  },
  {
    id: 5,
    name: "Enrolled Courses",
    path: "/dashboard/enrolled-courses",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscMortarBoard",
  },
  {
    id: 6,
    name: "Purchase History",
    path: "/dashboard/purchase-history",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscHistory",
  },
  {
    id: 7,
    name: "Admin",
    path: "/dashboard/admin",
    type: ACCOUNT_TYPE.ADMIN,
    icon: "VscShield",
  },
  {
    id: 10,
    name: "Organizations",
    path: "/dashboard/organizations",
    // No type restriction — buying/joining seats isn't role-gated
    // server-side (Organization.js), any account type can do both.
    icon: "VscOrganization",
  },
  {
    id: 11,
    name: "Refer & Earn",
    path: "/dashboard/affiliate",
    // Also not role-gated server-side (Affiliate.js) — anyone can refer.
    icon: "VscGift",
  },
];
