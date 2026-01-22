# Wireless Debugging Setup Guide

This guide explains how to install the app on your Android device (`RZ8NA1SLHSE`) using Wireless Debugging.

## Prerequisites

- **ADB Path**: Your ADB executable is located at:
  `C:\Users\umama\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- **Device**: Ensure your device is connected to the same Wi-Fi network as this computer.

## Step 1: Enable Wireless Debugging on Phone

1.  Open **Settings** > **Developer Options**.
2.  Scroll down to **Wireless debugging** and toggle it **ON**.
3.  Tap on **Wireless debugging** text to enter the menu.

## Step 2: Pair Device (Choose Method)

### Method A: Pairing with QR Code (Easiest)

Since you have **Android Studio** installed, you can use it to generate the QR code:

1.  Open **Android Studio**.
2.  On the Welcome screen (or top toolbar), click the **Device Manager** icon (phone with android logo).
3.  Click the **+ (Plus)** button or "Pair using Wi-Fi".
4.  It will display a **QR Code** on your computer screen.
5.  On your phone, inside the **Wireless debugging** menu, tap **Pair device with QR code**.
6.  Scan the code on your computer screen.

### Method B: Pairing with Code (Manual)

*If you cannot open Android Studio, use this method.*

1.  In the Wireless debugging menu, tap **Pair device with pairing code**.
2.  You will see an **Wi-Fi pairing code** (6 digits) and an **IP address & Port** (e.g., `192.168.1.5:37123`).
3.  Run the following command in your terminal (replace with actual values):

    ```powershell
    & "C:\Users\umama\AppData\Local\Android\Sdk\platform-tools\adb.exe" pair IP_ADDRESS:PORT
    ```

4.  Enter the pairing code when prompted.

## Step 3: Connect to Device

1.  Go back to the main **Wireless debugging** screen.
2.  Note the **IP address & Port** displayed under "IP address & Port" (e.g., `192.168.1.5:41000`). *Note: This port is different from the pairing port.*
3.  Run the connect command:

    ```powershell
    & "C:\Users\umama\AppData\Local\Android\Sdk\platform-tools\adb.exe" connect IP_ADDRESS:PORT
    ```

## Step 4: Install and Run App

Once connected, you can install the app easily:

```powershell
npx cap run android --target RZ8NA1SLHSE
```

*Note: If that doesn't work, try simply:*

```powershell
npx cap run android
```

And select your device from the list.
