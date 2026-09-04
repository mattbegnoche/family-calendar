"use client";
import { Button } from "./button";
import { signOutUser } from "@/app/actions/auth";

function SignOutButton() {
  return <Button onClick={() => signOutUser()}>Sign Out</Button>;
}

export default SignOutButton;
