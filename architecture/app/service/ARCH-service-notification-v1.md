---
id: ARCH-service-notification
title: "Service. Notification Service"
type: service
layer: presentation
owner: '@frontend-team'
version: v1
status: current
created: 2025-07-13
updated: 2025-07-13
tags: [notifications, service]
depends_on: []
referenced_by: []
---
## Context
This service encapsulates all interactions with the browser's Web Notification API. It provides a clean, reusable, and testable interface for other parts of the application to send OS-level notifications, abstracting away the browser-specific implementation details.

## Structure
The service will be implemented as a new file: `frontend/src/services/notificationService.ts`.

It will expose the following functions:

*   **`requestPermission()`**
    *   **Description:** Checks the current permission status for notifications. If the status is `default`, it will prompt the user to grant permission. This function is intended to be called once at application startup. It handles all three permission states ('granted', 'denied', 'default') gracefully.

*   **`showNotification(title, options)`**
    *   **Description:** Displays a notification if permission has been granted. It will accept a `title` (string) and an `options` object.
    *   **Options:** The `options` object can contain a `body` (string for the main message) and an `icon` (URL to an image, e.g., `/favicon.png`).

## Behavior
The `requestPermission` function will check for the existence of the `Notification` object on the `window` to ensure browser support before proceeding.

The `showNotification` function will first verify that `Notification.permission` is `'granted'` before attempting to create and display a `new Notification()`. This prevents errors if the user has denied permission. It will be designed to fail silently if notifications cannot be shown for any reason.

## Evolution
### Historical
- v1: Initial plan for a dedicated notification service.
