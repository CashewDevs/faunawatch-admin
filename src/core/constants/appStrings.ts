/**
 * User-facing copy for FaunaWatch Admin.
 *
 * Views must reference text via this constants object instead of
 * hardcoding strings.
 */

/** Decline reason labels, shared by the decline dialog and Analytics. */
const declineReasonLabels = {
  inaccurateSpecies: "Inaccurate Species ID",
  lowQualityPhoto: "Low-quality / Blurred Photo",
  domesticSpecimen: "Domestic / Non-wild Specimen",
  duplicateSighting: "Duplicate Sighting",
  inaccurateLocation: "Inaccurate GPS Location",
  inappropriateContent: "Inappropriate Content",
  notWildlife: "Not Wildlife / Unrelated",
} as const;

export const AppStrings = {
  common: {
    loading: "Loading FaunaWatch Admin",
    /** The × on a result message, e.g. "Post approved.". */
    dismissMessage: "Dismiss message",
    /** Shown when a screen fails to load, e.g. its code couldn't download. */
    screenError: {
      message: "Couldn't load this screen.",
      reload: "Reload",
    },
    pagination: {
      showing: "Showing",
      of: "of",
      show: "Show:",
      perPage: "per page",
      label: "Pagination",
      previous: "Previous page",
      next: "Next page",
      page: "Page",
    },
  },
  layout: {
    brandName: "FaunaWatch",
    consoleLabel: "Moderation Console",
    navLabel: "Main navigation",
    navUsers: "User Management",
    navPosts: "Post Approvals",
    navAnalytics: "Analytics",
    notifications: "Notifications",
    logout: "Log out",
    /** Shown when the signed-in admin has no name or email to display. */
    profileFallbackName: "Admin",
    profileRole: "Administrator",
  },
  users: {
    heading: "User Management",
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
      /** Added to an admin's disabled switch, which can't be changed. */
      adminLocked: "Admins can't be suspended",
      /** Shown when a profile has no name, username or email. */
      unnamed: "Unnamed user",
      noEmail: "No email",
    },
    pagination: {
      users: "users",
      pageSizeLabel: "Users per page",
    },
    suspension: {
      /** Titles name the user, e.g. "Suspend Klip Bautista?". */
      titlePrefix: {
        suspend: "Suspend",
        reactivate: "Reactivate",
      },
      titleSuffix: "?",
      body: {
        suspend:
          "They can still sign in, but can't post reports, comments or community responses until the suspension ends.",
        reactivate:
          "They can post reports, comments and community responses again straight away.",
      },
      durationLabel: "Length",
      durations: {
        oneDay: "1 day",
        sevenDays: "7 days",
        thirtyDays: "30 days",
        untilReactivated: "Until reactivated",
      },
      reasonLabel: "Reason",
      reasons: {
        spam: "Spam",
        harassment: "Harassment or abuse",
        misleadingReports: "Fake or misleading reports",
        inappropriateContent: "Inappropriate content",
        other: "Other",
      },
      detailsLabel: "Details (optional)",
      detailsRequiredLabel: "Details",
      detailsHint: "The user can see the reason and these details.",
      /** The active suspension, shown before reactivating. */
      currentReason: "Reason",
      currentEnds: "Ends",
      untilReactivated: "When an admin reactivates them",
      noReason: "No reason recorded",
      cancel: "Cancel",
      confirm: {
        suspend: "Suspend",
        reactivate: "Reactivate",
      },
      saving: "Saving…",
      /** Shown in the dialog; the admin can try again. */
      failed: "Couldn't save the change. Check your connection and try again.",
      /** Shown after the dialog closes; nothing was changed. */
      errors: {
        isAdmin:
          "Admins can't be suspended, so nothing was changed. The list has been reloaded.",
        alreadySuspended:
          "This user was already suspended by another admin, so nothing was changed. The list has been reloaded.",
        notSuspended:
          "This user isn't suspended any more, so nothing was changed. Another admin may have reactivated them, or the suspension ended. The list has been reloaded.",
        notFound:
          "This user no longer exists, so nothing was changed. The list has been reloaded.",
        forbidden:
          "Your account can't suspend users. Sign out and back in, or ask another admin.",
      },
      /** Success messages follow the user's name, e.g. "Klip Bautista suspended for 7 days." */
      success: {
        oneDay: "suspended for 1 day.",
        sevenDays: "suspended for 7 days.",
        thirtyDays: "suspended for 30 days.",
        untilReactivated: "suspended until reactivated.",
        reactivate: "reactivated.",
      },
    },
    loading: "Loading users…",
    empty: "No users match your search or filters.",
    error: "Couldn't load users.",
    retry: "Try again",
  },
  posts: {
    heading: "Post Approvals",
    tabsLabel: "Filter by review status",
    tabs: {
      pending: "Pending",
      changes_requested: "Changes requested",
      approved: "Approved",
      declined: "Declined",
      all: "All Posts",
    },
    searchLabel: "Search posts",
    searchPlaceholder: "Search by species, reporter, or post ID...",
    filters: {
      label: "Filter posts",
      severityLabel: "Filter by severity",
      severityPrefix: "Severity:",
      allSeverities: "All",
      categoryLabel: "Filter by category",
      categoryPrefix: "Category:",
      allCategories: "All",
      sortLabel: "Sort posts",
      sortPrefix: "Sort:",
      clear: "Clear filters",
    },
    severity: {
      high: "High",
      medium: "Medium",
      low: "Low",
      unrated: "Unrated",
    },
    severitySuffix: "Severity",
    /** Report categories; also each post's title. */
    category: {
      animal_in_need: "Animal in need",
      potentially_dangerous_animal: "Potentially dangerous animal",
      possible_invasive_species: "Possible invasive species",
      other_wildlife_incident: "Other wildlife incident",
    },
    sortOptions: {
      newest: "Newest First",
      oldest: "Oldest First",
      severity: "Highest Severity",
    },
    /** The AI's qualitative confidence in its species match. */
    confidence: {
      high: "High confidence",
      medium: "Medium confidence",
      low: "Low confidence",
      uncertain: "Uncertain match",
    },
    status: {
      pending: "Pending Review",
      changes_requested: "Changes requested",
      approved: "Approved",
      declined: "Declined",
      /** A status this site doesn't recognise; see toPostStatus. */
      unknown: "Unknown status",
    },
    card: {
      invasive: "Invasive",
      select: "Select post",
      morePhotos: "more photos",
      aiPrefix: "AI:",
      invasiveSuffix: "(Invasive)",
      review: "Review",
      decline: "Decline",
      approve: "Approve",
    },
    /** The approve / decline / take-down dialog and its result messages. */
    moderation: {
      title: {
        approve: "Approve this post?",
        decline: "Decline this post?",
        takeDown: "Take down this post?",
      },
      /** Titles for several posts, e.g. "Approve 3 posts?". */
      titleManyPrefix: {
        approve: "Approve",
        decline: "Decline",
        takeDown: "Take down",
      },
      titleManySuffix: "posts?",
      body: {
        approve:
          "It becomes visible to the community straight away. If it turns out to be wrong, you can take it down later from its review page.",
        decline:
          "It stays hidden from the community. A declined post can't be approved later.",
        takeDown:
          "It's removed from the community map, and its photos and comments are hidden. A taken-down post can't be approved again.",
      },
      bodyMany: {
        approve:
          "They become visible to the community straight away. If one turns out to be wrong, you can take it down later from its review page.",
        decline:
          "They stay hidden from the community. Declined posts can't be approved later.",
        takeDown:
          "They're removed from the community map, and their photos and comments are hidden. Taken-down posts can't be approved again.",
      },
      reasonLabel: "Reason",
      reasonManyHint: "The same reason is recorded for every selected post.",
      reasons: declineReasonLabels,
      cancel: "Cancel",
      confirm: {
        approve: "Approve",
        decline: "Decline",
        takeDown: "Take down",
      },
      saving: "Saving…",
      /** Shown in the dialog; the admin can try again. */
      failed:
        "Couldn't save the decision. Check your connection and try again.",
      /** Shown after the dialog closes; nothing was changed. */
      errors: {
        alreadyDecided:
          "This post was already decided by another admin, so nothing was changed. It has been reloaded.",
        alreadyDecidedMany:
          "At least one of these posts was already decided by another admin, so nothing was changed. The list has been reloaded.",
        notFound:
          "This post no longer exists, so nothing was changed. It has been reloaded.",
        notFoundMany:
          "At least one of these posts no longer exists, so nothing was changed. The list has been reloaded.",
        forbidden:
          "Your account can't make moderation decisions. Sign out and back in, or ask another admin.",
        /** The post was sent back for changes meanwhile (the server says "already decided"). */
        awaitingChanges:
          "This post is waiting for the reporter's changes, so nothing was changed. It has been reloaded.",
        awaitingChangesMany:
          "These posts are waiting for the reporter's changes, so nothing was changed. The list has been reloaded.",
        /** Some of the selected posts were decided, the others sent back. */
        decidedOrAwaitingChangesMany:
          "Some of these posts were already decided or are waiting for the reporter's changes, so nothing was changed. The list has been reloaded.",
      },
      /** Success messages; several posts get the count in front, e.g. "3 posts approved." */
      success: {
        approve: "Post approved.",
        decline: "Post declined.",
        takeDown: "Post taken down.",
      },
      successMany: {
        approve: "posts approved.",
        decline: "posts declined.",
        takeDown: "posts taken down.",
      },
    },
    /** The Request changes / Withdraw request dialog and its result messages. */
    changeRequest: {
      title: {
        request: "Request changes?",
        withdraw: "Withdraw this request?",
      },
      body: {
        request:
          "The reporter will be asked to edit this post and resubmit it. It stays hidden from the community until it is approved.",
        withdraw:
          "The post goes back to Pending Review and the request is closed.",
      },
      fieldsLabel: "What needs fixing (optional)",
      fields: {
        photos: "Photos",
        speciesDescription: "Species / description",
        location: "Location",
        category: "Category",
      },
      messageLabel: "Message to the reporter",
      messageHint: "Say what to fix. The reporter will see this message.",
      cancel: "Cancel",
      confirm: {
        request: "Request changes",
        withdraw: "Withdraw request",
      },
      saving: "Saving…",
      /** Shown in the dialog; the admin can try again. */
      failed: "Couldn't save the change. Check your connection and try again.",
      /** The server refused the message (invalid_parameter_value); the dialog stays open. */
      invalidMessage: "The message must be 1–500 characters.",
      /** Shown after the dialog closes; nothing was changed. */
      errors: {
        notPending:
          "This post is no longer pending, so nothing was changed. It has been reloaded.",
        notAwaitingChanges:
          "This post is no longer waiting for the reporter's changes (they may have resubmitted, or another admin withdrew the request), so nothing was changed. It has been reloaded.",
        notFound:
          "This post no longer exists, so nothing was changed. It has been reloaded.",
        forbidden:
          "Your account can't make moderation decisions. Sign out and back in, or ask another admin.",
      },
      success: {
        request: "Changes requested. The post is waiting for the reporter.",
        withdraw: "Request withdrawn. The post is pending again.",
      },
    },
    bulk: {
      label: "Bulk actions",
      selectedOne: "post selected",
      selectedMany: "posts selected",
      selectAll: "Select all",
      unselectAll: "Unselect all",
      approve: "Approve",
      decline: "Decline",
      /** Accessible names, e.g. "Approve 4 selected posts". */
      selectedPostsSuffix: "selected posts",
      selectedPostSuffix: "selected post",
    },
    pagination: {
      posts: "posts",
      pageSizeLabel: "Posts per page",
    },
    gridLabel: "Posts",
    loading: "Loading posts…",
    empty: "No posts match your search or filters.",
    error: "Couldn't load posts.",
    retry: "Try again",
    detail: {
      back: "Back to Post Approvals",
      breadcrumbLabel: "Breadcrumb",
      postPrefix: "Post #",
      pagerLabel: "Review queue",
      previous: "Prev",
      next: "Next",
      of: "of",
      previousLabel: "Previous post",
      nextLabel: "Next post",
      gallery: {
        label: "Photos",
        zoom: "Open full-size photo",
        previous: "Previous photo",
        next: "Next photo",
        photo: "Photo",
        noFlash: "No Artificial Flash Detected",
        flashUsed: "Artificial Flash Detected",
        cameraSettings: "Camera settings",
      },
      submittedPrefix: "Submitted:",
      nightObservation: "Night Observation",
      descriptionHeading: "Description",
      reporterNotesHeading: "Reporter's notes",
      fieldNotesLabel: "Field notes",
      fields: {
        elevation: "Elevation",
        perchHeight: "Height on Perch",
        hostTree: "Host Tree",
        observerDevice: "Observer Device",
      },
      metersSuffix: "m",
      location: {
        heading: "Location",
        exifVerified: "Verified via EXIF GPS",
        exifMismatch: "Photo GPS doesn't match",
        exifNoGps: "No photo location",
        elevationPrefix: "Elev:",
        copy: "Copy",
        copied: "Copied",
        copyLabel: "Copy coordinates",
        fullMap: "View in full map",
        fullMapUnavailable: "Full map view isn't available yet",
      },
      comments: {
        heading: "Comments",
        sortLabel: "Sort comments",
        sortPrefix: "Sort by:",
        sort: {
          newest: "Newest",
          oldest: "Oldest",
        },
        /** The trash button's name, followed by the author. */
        removeCommentBy: "Remove comment by",
        flagged: "Flagged",
        remove: "Remove",
        reviewFlag: "Review Flag",
        moderationNote: "Moderation Note:",
        /** A removed comment, still shown to admins. */
        removed: "Removed",
        removedBy: "Removed by",
        /** Removed by an admin whose account was deleted. */
        formerAdmin: "a former admin",
        unknownAdmin: "an admin",
        removalReason: "Reason:",
        restore: "Restore",
        /** The restore button's name, followed by the author. */
        restoreCommentBy: "Restore comment by",
        moderation: {
          title: {
            remove: "Remove this comment?",
            restore: "Restore this comment?",
            clearFlag: "Keep this comment?",
          },
          body: {
            remove:
              "It's hidden from the community straight away. You can restore it later.",
            restore: "It becomes visible to the community again.",
            clearFlag:
              "The flag is cleared and the comment stays visible to the community.",
          },
          /** Introduces the comment being moderated. */
          commentBy: "Comment by",
          reasonLabel: "Reason",
          reasonHint: "Only admins can see this.",
          cancel: "Cancel",
          confirm: {
            remove: "Remove",
            restore: "Restore",
            clearFlag: "Clear flag",
          },
          saving: "Saving…",
          /** Shown in the dialog; the admin can try again. */
          failed:
            "Couldn't save the change. Check your connection and try again.",
          /** Shown after the dialog closes; nothing was changed. */
          errors: {
            alreadyChanged:
              "Another admin already changed this comment, so nothing was changed. It has been reloaded.",
            notFound:
              "This comment no longer exists, so nothing was changed. Its author may have deleted it. The post has been reloaded.",
            forbidden:
              "Your account can't moderate comments. Sign out and back in, or ask another admin.",
          },
          success: {
            remove: "Comment removed.",
            restore: "Comment restored.",
            clearFlag: "Flag cleared.",
          },
        },
        showMore: "Show more comments",
        showFewer: "Show fewer comments",
        empty: "No comments yet.",
      },
      reporter: {
        label: "Reporter",
        verified: "Verified reporter",
        memberSince: "Member since",
        totalPosts: "Total Posts",
        approved: "Approved",
        declined: "Declined",
        approvalRate: "Approval Rate",
        viewProfile: "View Profile",
        profileUnavailable: "Reporter profiles aren't available yet",
      },
      ai: {
        heading: "AI Analysis",
        subheading: "Preliminary · AI analysis from the reporter's device",
        identifiedSpecies: "Identified Species",
        reporterSpecies: "Reporter's ID",
        unavailable: "No AI analysis is available for this report.",
        notInvasive: "Not Invasive",
        invasive: "Invasive Species",
        origin: {
          endemic: "Native Endemic",
          native: "Native",
          introduced: "Introduced",
        },
        safeToVerify: "Safe to verify",
        checklist: "Validation Checklist",
        /** Known `validation` labels; others are shown humanized. */
        checks: {
          image_relevant: "Photo matches the report",
          safe_content: "Content is safe",
          location_consistent: "Location is consistent",
        } as Partial<Record<string, string>>,
        failed: "Needs review",
        synthesis: "AI Diagnostic Synthesis",
        recommendations: "Field Recommendations",
      },
      notes: {
        label: "Admin notes (optional)",
        placeholder:
          "Add internal moderation note or feedback for ranger dispatch...",
        visibility: "Visible only to admins",
        /** Replaces Figma's "Auto-saved to audit log": notes are saved with the button. */
        permanence: "Saved notes can't be edited",
        listLabel: "Earlier notes",
        formerAdmin: "Former admin",
        unknownAdmin: "Unknown admin",
        save: "Save note",
        saving: "Saving…",
        saved: "Note saved.",
        saveFailed:
          "Couldn't save the note. Your text is still here; try again.",
        loadFailed: "Couldn't load earlier notes.",
        retry: "Try again",
        /** Shown in the decision dialog when there is unsaved note text. */
        savedWithDecision: "Your admin note will be saved with this decision.",
        /** Shown in the Request changes / Withdraw dialog when there is unsaved note text. */
        savedWithChange: "Your unsaved note will be saved with this change.",
        /** e.g. "1,980 / 2,000" near the limit. */
        lengthSeparator: "/",
      },
      decision: {
        label: "Review decision",
        byPrefix: "by",
        priorityPrefix: "Priority:",
        endemicSafeguard: "Endemic species safeguard active",
        decline: "Decline",
        requestChanges: "Request changes",
        requestChangesUnavailable: "Request changes isn't available yet",
        approve: "Approve",
        takeDown: "Take down",
        withdrawRequest: "Withdraw request",
      },
      /** Every round of Request changes on the post, newest first. */
      changeRequests: {
        heading: "Change requests",
        listLabel: "Change request rounds",
        round: "Round",
        fieldsLabel: "Needs fixing",
        requestedByPrefix: "Requested by",
        formerAdmin: "a former admin",
        unknownAdmin: "an admin",
        waitingSince: "Waiting since",
        resubmitted: "Resubmitted",
        withdrawnByPrefix: "Withdrawn by",
        separator: "·",
        loadFailed: "Couldn't load change requests.",
        retry: "Try again",
      },
      loading: "Loading post…",
      error: "Couldn't load this post.",
      notFound: "This post doesn't exist or was removed.",
      retry: "Try again",
    },
  },
  analytics: {
    heading: "Analytics",
    tabsLabel: "Analytics sections",
    tabs: {
      overview: "Overview",
      species: "Species & Severity",
      hotspots: "Hotspots & Invasives",
      moderation: "Contributors & Moderation",
    },
    rangeLabel: "Date range",
    ranges: {
      "7d": "7D",
      "30d": "Last 30 days",
      "90d": "Last 90 days",
      "12m": "Last 12 months",
    },
    /** Short badge for cards, e.g. "30-day". */
    rangeBadges: {
      "7d": "7-day",
      "30d": "30-day",
      "90d": "90-day",
      "12m": "12-month",
    },
    customRange: "Custom",
    customRangeUnavailable: "Custom date ranges aren't available yet",
    exportReport: "Export report",
    exportUnavailable: "Report export isn't available yet",
    loading: "Loading…",
    loadingScreen: "Loading analytics…",
    error: "Couldn't load this data.",
    retry: "Try again",
    empty: "No data for this date range.",
    postsOverTime: {
      heading: "Posts Over Time",
      description: "Sighting submissions vs verification decisions",
      granularityLabel: "Chart interval",
      granularities: {
        daily: "Daily",
        weekly: "Weekly",
        monthly: "Monthly",
      },
      series: {
        submitted: "Submitted",
        approved: "Approved",
        declined: "Declined",
      },
      weekOf: "Week of",
      chartLabel: "Posts submitted, approved, and declined over time",
    },
    reviewOutcomes: {
      heading: "Review Outcomes",
      description: "Reports submitted in this range, by review status",
      totalLabel: "Posts",
      approvedSuffix: "Approved",
      outcomes: {
        approved: "Approved Sightings",
        declined: "Declined",
        awaitingTriage: "Awaiting Review",
        changesRequested: "Changes requested",
      },
    },
    topSpecies: {
      heading: "Top Reported Species",
      topPrefix: "Top",
      description: "Species the AI identified most often",
    },
    categories: {
      heading: "Posts by Category",
      description: "Reports by incident category",
      barLabel: "Share of posts by category",
      names: {
        animal_in_need: "Animal in need",
        potentially_dangerous_animal: "Potentially dangerous animal",
        possible_invasive_species: "Possible invasive species",
        other_wildlife_incident: "Other wildlife incident",
      },
    },
    severity: {
      heading: "Severity Breakdown",
      description: "Severity the AI assigned on the reporter's device",
      barLabel: "Share of posts by severity",
      reviewSuffix: "review",
      tiers: {
        low: {
          name: "Low Severity",
          description: "AI rated the incident low",
        },
        medium: {
          name: "Medium Severity",
          description: "AI rated the incident moderate",
        },
        high: {
          name: "High Severity",
          description: "AI rated the incident high or critical",
        },
        unrated: {
          name: "Unrated Severity",
          description: "No completed AI analysis, or the AI was uncertain",
        },
      },
    },
    hotspots: {
      heading: "Sighting Hotspots",
      description: "Where reports cluster, by map area (about 11 km across)",
      categoryLabel: "Filter hotspots by category",
      allCategories: "All Categories",
      panelLabel: "Report hotspots by map area",
      sightingsSuffix: "reports",
      densityLabel: "Density Index:",
      density: {
        low: "Low",
        moderate: "Moderate",
        high: "High",
        critical: "Critical Hotspot",
      },
    },
    invasive: {
      heading: "Invasive Species Alerts",
      activeSuffix: "flagged",
      viewAll: "View all",
      viewAllUnavailable: "A full invasive-species list isn't available yet",
      description: "Newest reports the AI flagged as possibly invasive",
      listLabel: "Invasive species alerts",
    },
    contributors: {
      heading: "Top Contributors",
      description: "Reporters with the most submissions in this range",
      caption: "Top contributors",
      rankAndRanger: "Rank & Ranger",
      submissions: "Submissions",
      approvalRate: "Approval Rate",
      postsSuffix: "posts",
      postSuffix: "post",
      rankPrefix: "Rank",
    },
    moderation: {
      heading: "Moderation Activity",
      description: "Decisions per reviewer and why reports were declined",
      reviewerAllocation: "Reviewer Allocation",
      reviewerBarLabel: "Share of decisions by reviewer",
      otherReviewers: "Others",
      unknownReviewer: "Unknown reviewer",
      /** Decisions by admins whose accounts were deleted. */
      formerReviewer: "Former admin",
      declineReasons: "Most Common Decline Reasons",
      reasons: declineReasonLabels,
    },
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
    submitting: "Logging in…",
    submitCooldownPrefix: "Try again in",
    secondsSuffix: "s",
    googleDivider: "or continue with",
    googleButton: "Google",
    googleButtonLabel: "Continue with Google",
    googleRedirecting: "Redirecting…",
    footerNote: "Authorized administrators only. Access is monitored.",
    errors: {
      emailRequired: "Email address is required.",
      emailInvalid: "Enter a valid email address.",
      passwordRequired: "Password is required.",
      invalidCredentials: "Incorrect email or password.",
      emailNotConfirmed: "Confirm your email address before logging in.",
      rateLimited: "Too many attempts. Please wait a moment and try again.",
      cooldown: "Too many failed attempts. Please wait before trying again.",
      network: "Can't reach the server. Check your connection and try again.",
      notAdmin: "This account doesn't have admin access.",
      oauthFailed:
        "Google sign-in was cancelled or didn't complete. Please try again.",
      unknown: "Something went wrong. Please try again.",
    },
    passwordUpdated:
      "Your password was updated. Log in with your new password.",
  },
  forgotPassword: {
    heading: "Forgot your password?",
    subheading: "Enter your email and we'll send you a link to set a new one.",
    submit: "Send reset link",
    submitting: "Sending…",
    sentHeading: "Check your email",
    sentLead: "If an account exists for",
    sentTail:
      ", we've sent a reset link to that address. Open it in this browser. The link lasts 1 hour. If you don't see it, check your spam folder.",
    sendAgain: "Send again",
    sendAgainIn: "in",
  },
  resetPassword: {
    heading: "Set a new password",
    subheading:
      "This also changes the password for this account in the FaunaWatch mobile app.",
    passwordLabel: "New password",
    passwordPlaceholder: "At least 8 characters",
    confirmationLabel: "Confirm new password",
    confirmationPlaceholder: "Re-enter your password",
    submit: "Save password",
    submitting: "Saving…",
    blockedHeading: "This link can't be used",
    requestNewLink: "Request a new link",
    backToLogin: "Back to log in",
    blocked: {
      linkInvalid:
        "Reset links last 1 hour and work once, and only the newest one works.",
      otherBrowser:
        "This link only works in the browser you used to request it. Request a new link from this browser to try again.",
      notAdmin:
        "This account doesn't have admin access, so its password can't be reset here. The password hasn't changed.",
      checkFailed:
        "We couldn't confirm this account, so its password hasn't changed. Please try again with a new link.",
    },
    errors: {
      passwordRequired: "New password is required.",
      passwordTooShort: "Password must be at least 8 characters.",
      passwordTooLong: "Password is too long. Use 72 characters or fewer.",
      passwordWeak: "This password is too weak. Try a longer one.",
      passwordSame: "Use a different password from your current one.",
      confirmationRequired: "Confirm your new password.",
      confirmationMismatch: "Passwords don't match.",
    },
  },
} as const;
