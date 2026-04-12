import Capacitor
import UIKit
import WebKit

class KioskViewController: CAPBridgeViewController {
    private var statusLabel: UILabel?
    private var retryTimer: Timer?
    private let serverUrl = "http://homelab"

    override var prefersHomeIndicatorAutoHidden: Bool {
        return true
    }

    override var prefersStatusBarHidden: Bool {
        return true
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return .landscape
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupStatusLabel()
        showStatus("Connecting to homelab...")
        startMonitoringWebView()
    }

    private func setupStatusLabel() {
        let label = UILabel()
        label.textColor = UIColor(white: 0.4, alpha: 1.0)
        label.font = UIFont.monospacedSystemFont(ofSize: 14, weight: .regular)
        label.textAlignment = .center
        label.numberOfLines = 0
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 40),
            label.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -40),
        ])
        statusLabel = label
    }

    private func showStatus(_ message: String) {
        statusLabel?.text = message
        statusLabel?.isHidden = false
        view.bringSubviewToFront(statusLabel!)
    }

    private func hideStatus() {
        statusLabel?.isHidden = true
    }

    private func startMonitoringWebView() {
        webView?.navigationDelegate = self
    }
}

extension KioskViewController: WKNavigationDelegate {
    func webView(_: WKWebView, didFinish _: WKNavigation!) {
        hideStatus()
        retryTimer?.invalidate()
        retryTimer = nil
    }

    func webView(_: WKWebView, didFail _: WKNavigation!, withError error: Error) {
        handleLoadError(error)
    }

    func webView(_: WKWebView, didFailProvisionalNavigation _: WKNavigation!, withError error: Error) {
        handleLoadError(error)
    }

    private func handleLoadError(_ error: Error) {
        let nsError = error as NSError
        let message: String
        if nsError.code == NSURLErrorNotConnectedToInternet {
            message = "No network connection\nWaiting for network..."
        } else if nsError.code == NSURLErrorCannotConnectToHost || nsError.code == NSURLErrorTimedOut {
            message = "Cannot reach homelab\nRetrying..."
        } else {
            message = "Connection error: \(nsError.localizedDescription)\nRetrying..."
        }
        showStatus(message)
        scheduleRetry()
    }

    private func scheduleRetry() {
        retryTimer?.invalidate()
        retryTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: false) { [weak self] _ in
            guard let self = self, let webView = self.webView else { return }
            self.showStatus("Reconnecting to homelab...")
            if let url = URL(string: self.serverUrl) {
                webView.load(URLRequest(url: url))
            }
        }
    }
}
