import { lockFactory, lockDecoratorFactory } from "universal-lock";
import { createBackend } from "@universal-lock/memory";

export const lock = lockFactory(createBackend());
export const withLock = lockDecoratorFactory(lock);
