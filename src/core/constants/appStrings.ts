/**
 * User-facing copy for FaunaWatch Admin.
 *
 * Views must reference text via this constants object instead of
 * hardcoding strings.
 */
export const AppStrings = {
  common: {
    loading: "Loading FaunaWatch Admin",
  },
  layout: {
    brandName: "FaunaWatch",
    consoleLabel: "Moderation Console",
    navLabel: "Main navigation",
    navUsers: "User Management",
    adminBadge: "Admin",
    notifications: "Notifications",
    logout: "Log out",
    // TODO(auth): Replace with the signed-in admin's name and role once
    // Supabase auth and the admin role exist.
    profileName: "Admin User",
    profileRole: "Administrator",
  },
  users: {
    heading: "User Management",
    registeredSuffix: "Registered",
    description:
      "View, moderate, and inspect community members, field rangers, and contributing biologists.",
    exportCsv: "Export CSV",
    stats: {
      totalUsers: "Total Users",
      activeUsers: "Active Users",
      suspendedUsers: "Suspended Users",
      newThisMonth: "New This Month",
      thisWeek: "this week",
      thisMonth: "this month",
      activeRate: "active rate",
      vsLastMonth: "vs last mo",
    },
    searchLabel: "Search users",
    searchPlaceholder: "Search by name, username, or email...",
    searchShortcut: "⌘K",
    statusFilterLabel: "Filter by account status",
    statusFilter: {
      all: "All",
      active: "Active",
      suspended: "Suspended",
    },
    sortLabel: "Sort users",
    sortPrefix: "Sort by:",
    sortOptions: {
      newest: "Newest",
      oldest: "Oldest",
      name: "Name (A–Z)",
    },
    table: {
      caption: "Registered users",
      user: "User",
      email: "Email",
      joined: "Joined",
      posts: "Posts",
      accountStatus: "Account Status",
      postsSuffix: "posts",
      postSuffix: "post",
      verified: "Verified",
      sanctioned: "(Sanctioned)",
      status: {
        active: "Active",
        suspended: "Suspended",
      },
      toggleStatus: "Account active",
    },
    pagination: {
      showing: "Showing",
      of: "of",
      users: "users",
      show: "Show:",
      perPage: "per page",
      pageSizeLabel: "Users per page",
      label: "Pagination",
      previous: "Previous page",
      next: "Next page",
      page: "Page",
    },
    loading: "Loading users…",
    empty: "No users match your search or filters.",
    error: "Couldn't load users.",
    retry: "Try again",
  },
  login: {
    brandName: "FaunaWatch",
    adminBadge: "Admin",
    brandLogoAlt: "FaunaWatch",
    taglineLead: "Mapping life, ",
    taglineAccent: "one sighting at a time.",
    heading: "Welcome back",
    subheading: "Sign in to access the admin dashboard",
    emailLabel: "Email address",
    emailPlaceholder: "admin@faunawatch.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    submit: "Log In",
    footerNote: "Authorized administrators only. Access is monitored.",
    errors: {
      emailRequired: "Email address is required.",
      emailInvalid: "Enter a valid email address.",
      passwordRequired: "Password is required.",
    },
  },
} as const;
