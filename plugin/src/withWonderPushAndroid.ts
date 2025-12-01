import type { ConfigPlugin } from "@expo/config-plugins";
import {
  AndroidConfig,
  withAndroidManifest,
  withAndroidColors,
  withDangerousMod,
} from "@expo/config-plugins";
import type { WonderPushPluginProps } from ".";
import { generateImageAsync } from "@expo/image-utils";
import * as path from "path";
import * as fs from "fs";

// Helper to process icon resource names
function processIconResourceName(value: string): string {
  // Get the base name without path
  let processedValue = path.basename(value);

  // Strip all extensions from filename
  processedValue = processedValue.replace(/\.[^/.]+$/, "");
  // Keep stripping if there are more extensions
  while (path.extname(processedValue)) {
    processedValue = processedValue.replace(/\.[^/.]+$/, "");
  }

  // Prepend @drawable/ if it doesn't start with @
  if (!processedValue.startsWith("@")) {
    processedValue = `@drawable/${processedValue}`;
  }

  return processedValue;
}

// Helper to validate and process color resource
function validateColorResource(value: string): void {
  if (!value.startsWith("@")) {
    throw new Error(
      `android.defaultNotificationColorResource must start with '@'. Expected format: @color/resource_name, got: ${value}`
    );
  }
}

// Helper to parse and format color hex value
function parseColorHex(value: string): string {
  // Validate format
  if (!/^#?[0-9A-Fa-f]{6}$|^#?[0-9A-Fa-f]{8}$/.test(value)) {
    throw new Error(
      `android.defaultNotificationColor must be in [#][AA]RRGGBB format, got: ${value}`
    );
  }

  // Remove # if present
  let hex = value.startsWith("#") ? value.substring(1) : value;

  // If 6 digits (RRGGBB), prepend FF for full opacity
  if (hex.length === 6) {
    hex = `FF${hex}`;
  }

  return `#${hex.toUpperCase()}`;
}

// Helper to scale and copy image resources
async function processImageResources(
  projectRoot: string,
  imagePaths: string[],
  sizes: { [key: string]: number },
  resourceType: "mipmap" | "drawable" = "drawable"
): Promise<void> {
  for (const imagePath of imagePaths) {
    // Resolve the image path relative to the project root
    const resolvedImagePath = path.isAbsolute(imagePath)
      ? imagePath
      : path.join(projectRoot, imagePath);

    // Check if the image exists
    if (!fs.existsSync(resolvedImagePath)) {
      throw new Error(`Image not found: ${resolvedImagePath}`);
    }

    // Get the base name without extension for the output file
    const baseName = path.basename(imagePath, path.extname(imagePath));

    // Process each density
    for (const [density, size] of Object.entries(sizes)) {
      // Generate the scaled image
      const { source } = await generateImageAsync(
        { projectRoot },
        {
          src: resolvedImagePath,
          width: size,
          height: size,
          resizeMode: "cover",
          backgroundColor: "transparent",
        }
      );

      // Determine the output directory
      const outputDir = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "res",
        `${resourceType}-${density}`
      );

      // Ensure the directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write the scaled image
      const outputPath = path.join(outputDir, `${baseName}.png`);
      fs.writeFileSync(outputPath, source);
    }
  }
}

const withWonderPushAndroid: ConfigPlugin<WonderPushPluginProps | void> = (
  expoConfig,
  props
) => {
  const clientId = props?.clientId || "USE_REMEMBERED";
  const clientSecret = props?.clientSecret || "USE_REMEMBERED";
  const senderId = props?.senderId;
  const logging = props?.logging;
  const autoInit = props?.autoInit;
  const requiresUserConsent = props?.requiresUserConsent;
  const geolocation = props?.geolocation;
  const allowBackgroundStart = props?.allowBackgroundStart;

  // Extract Android-specific options
  const androidOptions = props?.android;
  const defaultNotificationIconResource =
    androidOptions?.defaultNotificationIconResource;
  const defaultNotificationColorResource =
    androidOptions?.defaultNotificationColorResource;
  const defaultNotificationColor = androidOptions?.defaultNotificationColor;
  const smallIcons = androidOptions?.smallIcons;
  const largeIcons = androidOptions?.largeIcons;

  // Validate that both color options are not used together
  if (defaultNotificationColorResource && defaultNotificationColor) {
    throw new Error(
      "Cannot use both android.defaultNotificationColorResource and android.defaultNotificationColor. " +
        "Please use only one of these options."
    );
  }

  // Validate color resource format if provided
  if (defaultNotificationColorResource) {
    validateColorResource(defaultNotificationColorResource);
  }

  // Parse and format color hex if provided
  let formattedColor: string | undefined;
  if (defaultNotificationColor) {
    formattedColor = parseColorHex(defaultNotificationColor);
  }

  // Process icon resource name if provided
  let processedIconResource: string | undefined;
  if (defaultNotificationIconResource) {
    processedIconResource = processIconResourceName(
      defaultNotificationIconResource
    );
  }

  // Add color resource using withAndroidColors
  if (formattedColor) {
    expoConfig = withAndroidColors(expoConfig, (config) => {
      config.modResults = AndroidConfig.Colors.assignColorValue(
        config.modResults,
        {
          name: "wonderpush_default_notification_color",
          value: formattedColor,
        }
      );
      return config;
    });
  }

  // Add withDangerousMod to handle image resources
  if (smallIcons && smallIcons.length > 0) {
    expoConfig = withDangerousMod(expoConfig, [
      "android",
      async (config) => {
        const sizes = {
          mdpi: 24,
          hdpi: 36,
          xhdpi: 48,
          xxhdpi: 72,
          xxxhdpi: 96,
        };
        await processImageResources(
          config.modRequest.projectRoot,
          smallIcons,
          sizes,
          "drawable"
        );
        return config;
      },
    ]);
  }

  if (largeIcons && largeIcons.length > 0) {
    expoConfig = withDangerousMod(expoConfig, [
      "android",
      async (config) => {
        const sizes = {
          xxxhdpi: 256,
        };
        await processImageResources(
          config.modRequest.projectRoot,
          largeIcons,
          sizes,
          "drawable"
        );
        return config;
      },
    ]);
  }

  return withAndroidManifest(expoConfig, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults
    );

    // Add clientId metadata
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      "com.wonderpush.sdk.clientId",
      clientId
    );

    // Add clientSecret metadata
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      "com.wonderpush.sdk.clientSecret",
      clientSecret
    );

    // Add senderId metadata only if provided and non-empty
    if (senderId && senderId.trim() !== "") {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        mainApplication,
        "com.wonderpush.sdk.senderId",
        senderId
      );
    }

    // Add logging metadata if explicitly set to true or false
    if (typeof logging === "boolean") {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        mainApplication,
        "com.wonderpush.sdk.logging",
        logging.toString()
      );
    }

    // Add autoInit metadata if explicitly set to true or false
    if (typeof autoInit === "boolean") {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        mainApplication,
        "com.wonderpush.sdk.autoInit",
        autoInit.toString()
      );
    }

    // Add requiresUserConsent metadata if explicitly set to true or false
    if (typeof requiresUserConsent === "boolean") {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        mainApplication,
        "com.wonderpush.sdk.requiresUserConsent",
        requiresUserConsent.toString()
      );
    }

    // Add geolocation metadata if explicitly set to true or false
    if (typeof geolocation === "boolean") {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        mainApplication,
        "com.wonderpush.sdk.geolocation",
        geolocation.toString()
      );
    }

    // Add allowBackgroundStart metadata if explicitly set to true or false
    if (typeof allowBackgroundStart === "boolean") {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        mainApplication,
        "com.wonderpush.sdk.reactnative.allowBackgroundStart",
        allowBackgroundStart.toString()
      );
    }

    // Add default notification icon resource if provided
    if (processedIconResource) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        mainApplication,
        "com.google.firebase.messaging.default_notification_icon",
        processedIconResource,
        "resource"
      );
    }

    // Add default notification color resource if provided
    if (defaultNotificationColorResource) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        mainApplication,
        "com.google.firebase.messaging.default_notification_color",
        defaultNotificationColorResource,
        "resource"
      );
    }

    // Add default notification color resource (from hex color) if provided
    if (formattedColor) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        mainApplication,
        "com.google.firebase.messaging.default_notification_color",
        "@color/wonderpush_default_notification_color",
        "resource"
      );
    }

    return config;
  });
};

export default withWonderPushAndroid;
