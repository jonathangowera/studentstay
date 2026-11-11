import { describe, expect, it } from "vitest";
import {
  ROLE_HOME,
  ROLES,
  canAccess,
  destinationAfterSignIn,
  isProtectedPath,
  requiredRoleForPath,
  safeNextPath,
  signInUrlFor,
} from "./roles";

describe("role homes", () => {
  it("gives each of the five roles its own home", () => {
    expect(ROLE_HOME).toEqual({
      student: "/student",
      owner: "/owner",
      university_admin: "/admin",
      technician: "/technician",
      system_admin: "/system",
    });
    expect(new Set(Object.values(ROLE_HOME)).size).toBe(ROLES.length);
  });
});

describe("requiredRoleForPath", () => {
  it.each([
    ["/student", "student"],
    ["/student/profile", "student"],
    ["/owner/setup", "owner"],
    ["/owner/audit", "owner"],
    ["/admin/audit", "university_admin"],
    ["/technician", "technician"],
    ["/system/audit", "system_admin"],
  ])("%s belongs to %s", (path, role) => {
    expect(requiredRoleForPath(path)).toBe(role);
  });

  it.each(["/", "/sign-in", "/sign-up/check-email", "/no-access", "/students", "/administrator", "/systems"])(
    "%s is public",
    (path) => {
      expect(requiredRoleForPath(path)).toBeNull();
      expect(isProtectedPath(path)).toBe(false);
    },
  );
});

describe("canAccess", () => {
  it("lets each role into its own area only", () => {
    for (const role of ROLES) {
      for (const other of ROLES) {
        expect(canAccess(role, ROLE_HOME[other] + "/profile")).toBe(role === other);
      }
    }
  });

  it("lets every role see public pages", () => {
    for (const role of ROLES) expect(canAccess(role, "/no-access")).toBe(true);
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/student/profile", "/student/profile"],
    ["/owner/audit?page=2", "/owner/audit?page=2"],
    ["/admin/audit#top", "/admin/audit#top"],
  ])("keeps the in-app path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    "student",
    "https://evil.example/student",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "/student\n/profile",
    "javascript:alert(1)",
    "/" + "a".repeat(600),
  ])("rejects %j", (input) => {
    expect(safeNextPath(input)).toBeNull();
  });

  it("normalises dot segments without leaving the app", () => {
    expect(safeNextPath("/student/../owner")).toBe("/owner");
    expect(safeNextPath("/../../etc")).toBe("/etc");
  });
});

describe("destinationAfterSignIn", () => {
  it("sends each role home when there is no next path", () => {
    for (const role of ROLES) expect(destinationAfterSignIn(role, null)).toBe(ROLE_HOME[role]);
  });

  it("returns to the page the person wanted when their role may see it", () => {
    expect(destinationAfterSignIn("owner", "/owner/audit?page=3")).toBe("/owner/audit?page=3");
  });

  it("goes home instead of to another role's page", () => {
    expect(destinationAfterSignIn("student", "/system/audit")).toBe("/student");
  });

  it("ignores unsafe and auth-page targets", () => {
    expect(destinationAfterSignIn("technician", "https://evil.example")).toBe("/technician");
    expect(destinationAfterSignIn("technician", "/sign-in")).toBe("/technician");
    expect(destinationAfterSignIn("technician", "/reset-password")).toBe("/technician");
    expect(destinationAfterSignIn("technician", "/")).toBe("/technician");
  });
});

describe("signInUrlFor", () => {
  it("carries the wanted page in next", () => {
    expect(signInUrlFor("/owner/audit?page=2")).toBe("/sign-in?next=%2Fowner%2Faudit%3Fpage%3D2");
  });
  it("drops unsafe targets", () => {
    expect(signInUrlFor("//evil.example")).toBe("/sign-in");
  });
});
