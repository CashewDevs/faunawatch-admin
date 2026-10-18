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
