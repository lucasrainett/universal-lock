import { lockFactory } from "universal-lock";
import { createMapBackend } from "./backend";

export const lock = lockFactory(createMapBackend());
