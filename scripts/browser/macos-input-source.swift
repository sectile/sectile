// Native compiler boundary used only by browser-verification.mjs on macOS.
import Carbon
import Foundation

func sourceID(_ source: TISInputSource) -> String {
    let pointer = TISGetInputSourceProperty(source, kTISPropertyInputSourceID)!
    return Unmanaged<CFString>.fromOpaque(pointer).takeUnretainedValue() as String
}

let previous = TISCopyCurrentKeyboardInputSource().takeRetainedValue()
let sources = TISCreateInputSourceList(nil, true).takeRetainedValue() as! [TISInputSource]
let requested = CommandLine.arguments.dropFirst().first
guard let selected = sources.first(where: { requested == nil ? sourceID($0).contains("2SetKorean") : sourceID($0) == requested! }) else {
    fputs("Required input source unavailable: \(requested ?? "Korean two-set"). Installed: \(sources.map(sourceID))\n", stderr)
    exit(1)
}
guard TISEnableInputSource(selected) == noErr, TISSelectInputSource(selected) == noErr else {
    fputs("Cannot enable/select the native keyboard input source\n", stderr)
    exit(1)
}
let result = ["selected": sourceID(selected), "previous": sourceID(previous)]
print(String(data: try JSONSerialization.data(withJSONObject: result), encoding: .utf8)!)
