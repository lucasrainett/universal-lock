import { lockFactory } from "universal-lock";
import { createBackend } from "@universal-lock/memory";

export const lock = lockFactory(createBackend());
