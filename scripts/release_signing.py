"""Install owner-key-only release signing; debug builds keep their normal test key."""
from pathlib import Path

MARKER='// ILMIGO owner release signing'
FIELDS=['ILMIGO_ANDROID_KEYSTORE','ILMIGO_ANDROID_STORE_PASSWORD','ILMIGO_ANDROID_KEY_ALIAS','ILMIGO_ANDROID_KEY_PASSWORD']

def configure_release(text):
    fallback='signingConfig = signingConfigs.getByName("debug")'
    if MARKER in text:
        if fallback in text: raise ValueError('Unsafe debug fallback remains in the release configuration.')
        return text
    if text.count(fallback)!=1 or '    buildTypes {' not in text:
        raise ValueError('Unsupported Android template. Refusing to leave release signing with debug credentials.')
    signing='''    // ILMIGO owner release signing
    signingConfigs {
        create("ilmigoRelease") {
            storeFile = System.getenv("ILMIGO_ANDROID_KEYSTORE")?.let { file(it) }
            storePassword = System.getenv("ILMIGO_ANDROID_STORE_PASSWORD")
            keyAlias = System.getenv("ILMIGO_ANDROID_KEY_ALIAS")
            keyPassword = System.getenv("ILMIGO_ANDROID_KEY_PASSWORD")
        }
    }
'''
    text=text.replace('    buildTypes {',signing+'    buildTypes {',1).replace(fallback,'signingConfig = signingConfigs.getByName("ilmigoRelease")',1)
    text+='''
// A release task must never silently use the debug upload identity.
gradle.taskGraph.whenReady {
    if (allTasks.any { it.name.contains("Release", ignoreCase = true) }) {
        val missing = listOf("ILMIGO_ANDROID_KEYSTORE", "ILMIGO_ANDROID_STORE_PASSWORD", "ILMIGO_ANDROID_KEY_ALIAS", "ILMIGO_ANDROID_KEY_PASSWORD")
            .filter { System.getenv(it).isNullOrBlank() }
        check(missing.isEmpty()) { "ILMIGO release signing requires owner credentials: " + missing.joinToString(", ") }
        check(file(System.getenv("ILMIGO_ANDROID_KEYSTORE") ?: "").isFile) { "ILMIGO release keystore file is missing." }
    }
}
'''
    return text

if __name__=='__main__':
    path=Path(__file__).resolve().parents[1]/'mobile/android/app/build.gradle.kts'
    path.write_text(configure_release(path.read_text()))
    print('Owner-only Android release signing configured; no credential values written to source.')
