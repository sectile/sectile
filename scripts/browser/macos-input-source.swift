// Native compiler boundary used only by browser-verification.mjs on macOS.
import Carbon
import Foundation
import ApplicationServices

func sourceID(_ source: TISInputSource) -> String {
    let pointer = TISGetInputSourceProperty(source, kTISPropertyInputSourceID)!
    return Unmanaged<CFString>.fromOpaque(pointer).takeUnretainedValue() as String
}

func textProperty(_ source: TISInputSource, _ key: CFString) -> String? {
    guard let pointer = TISGetInputSourceProperty(source, key) else { return nil }
    return Unmanaged<CFString>.fromOpaque(pointer).takeUnretainedValue() as String
}

func flag(_ source: TISInputSource, _ key: CFString) -> Bool {
    guard let pointer = TISGetInputSourceProperty(source, key) else { return false }
    return CFBooleanGetValue(Unmanaged<CFBoolean>.fromOpaque(pointer).takeUnretainedValue())
}

let previous = TISCopyCurrentKeyboardInputSource().takeRetainedValue()
let sources = TISCreateInputSourceList(nil, true).takeRetainedValue() as! [TISInputSource]
let requested = CommandLine.arguments.dropFirst().first
var asciiName: String?
if requested == "--type" {
    let arguments = Array(CommandLine.arguments.dropFirst(2))
    let command = arguments.first == "--command"
    let keys = command ? Array(arguments.dropFirst()) : arguments
    guard !keys.isEmpty, keys.allSatisfy({ UInt16($0).map { $0 < 128 } ?? false }),
          let eventSource = CGEventSource(stateID: .hidSystemState) else {
        fputs("Native typing requires bounded hardware key codes\n", stderr); exit(1)
    }
    RunLoop.current.run(until: Date(timeIntervalSinceNow: 1))
    for key in keys {
        for down in [true, false] {
            guard let event = CGEvent(keyboardEventSource: eventSource, virtualKey: UInt16(key)!, keyDown: down) else {
                fputs("Cannot create native keyboard event\n", stderr); exit(1)
            }
            event.flags = command ? .maskCommand : []
            event.setIntegerValueField(.keyboardEventAutorepeat, value: 0)
            event.post(tap: .cghidEventTap)
            RunLoop.current.run(until: Date(timeIntervalSinceNow: down ? 0.05 : 0.25))
        }
    }
    exit(0)
}
if requested == "--inspect" {
    let result: [String: Any] = ["current": sourceID(previous), "enabled": sources.filter {
        flag($0, kTISPropertyInputSourceIsEnabled) && flag($0, kTISPropertyInputSourceIsSelectCapable)
    }.map(sourceID)]
    print(String(data: try JSONSerialization.data(withJSONObject: result), encoding: .utf8)!)
    exit(0)
}
guard let selected = sources.first(where: { requested == nil ? sourceID($0).contains("2SetKorean") : sourceID($0) == requested! }) else {
    fputs("Required input source unavailable: \(requested ?? "Korean two-set"). Installed: \(sources.map(sourceID))\n", stderr)
    exit(1)
}
// Input modes depend on their parent input method being enabled first.
if textProperty(selected, kTISPropertyInputSourceType) == (kTISTypeKeyboardInputMode as String),
   let bundle = textProperty(selected, kTISPropertyBundleID),
   let method = sources.first(where: {
       textProperty($0, kTISPropertyBundleID) == bundle &&
       textProperty($0, kTISPropertyInputSourceType) == (kTISTypeKeyboardInputMethodModeEnabled as String)
   }) {
    let status = TISEnableInputSource(method)
    fputs("Parent input method \(sourceID(method)): enable=\(status)\n", stderr)
}
let enableStatus = flag(selected, kTISPropertyInputSourceIsEnableCapable) ? TISEnableInputSource(selected) : noErr
let selectStatus = TISSelectInputSource(selected)
guard enableStatus == noErr, selectStatus == noErr else {
    fputs("Cannot enable/select \(sourceID(selected)): enable=\(enableStatus), select=\(selectStatus), enabled=\(flag(selected, kTISPropertyInputSourceIsEnabled)), selectable=\(flag(selected, kTISPropertyInputSourceIsSelectCapable))\n", stderr)
    exit(1)
}
RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.3))
// Establish the Korean mode as the previous source, then let the OS shortcut
// activate its text input context. TIS selection alone can leave CJK modes ASCII.
if requested == nil {
    guard let ascii = sources.first(where: {
        flag($0, kTISPropertyInputSourceIsASCIICapable) &&
        flag($0, kTISPropertyInputSourceIsEnabled) &&
        textProperty($0, kTISPropertyInputSourceType) == (kTISTypeKeyboardLayout as String)
    }), TISSelectInputSource(ascii) == noErr else {
        fputs("Cannot select the ASCII source before native input-source switching\n", stderr)
        exit(1)
    }
    RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.3))
    asciiName = textProperty(ascii, kTISPropertyLocalizedName) ?? sourceID(ascii)
}
var result = ["selected": sourceID(selected), "previous": sourceID(previous),
              "name": textProperty(selected, kTISPropertyLocalizedName) ?? sourceID(selected)]
if let asciiName { result["asciiName"] = asciiName }
print(String(data: try JSONSerialization.data(withJSONObject: result), encoding: .utf8)!)
