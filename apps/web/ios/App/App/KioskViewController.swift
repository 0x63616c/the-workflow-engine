import Capacitor
import UIKit
import WebKit

class KioskViewController: CAPBridgeViewController {
    private var debugLabel: UILabel?

    override var prefersHomeIndicatorAutoHidden: Bool {
        return true
    }

    override var prefersStatusBarHidden: Bool {
        return true
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return .landscape
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if debugLabel == nil {
            setupDebugLabel()
            startDebugTimer()
        }
    }

    private func setupDebugLabel() {
        let label = UILabel()
        label.textColor = .white
        label.font = UIFont.monospacedSystemFont(ofSize: 13, weight: .regular)
        label.textAlignment = .center
        label.numberOfLines = 0
        label.translatesAutoresizingMaskIntoConstraints = false
        label.layer.zPosition = 9999

        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            label.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, constant: -40),
        ])
        debugLabel = label
        updateDebugInfo()
    }

    private func startDebugTimer() {
        Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            self?.updateDebugInfo()
        }
    }

    private func updateDebugInfo() {
        guard let webView = webView else {
            debugLabel?.text = "DEBUG: webView is nil"
            return
        }

        let url = webView.url?.absoluteString ?? "(nil)"
        let loading = webView.isLoading ? "yes" : "no"
        let title = webView.title ?? "(nil)"

        webView.evaluateJavaScript("document.body ? document.body.innerHTML.length : -1") { [weak self] result, error in
            let bodyLen = (result as? Int) ?? -1
            let errStr = error?.localizedDescription ?? "none"

            self?.debugLabel?.text = """
            DEBUG - Capacitor WebView
            URL: \(url)
            Loading: \(loading)
            Title: \(title)
            Body length: \(bodyLen)
            JS error: \(errStr)
            """
        }
    }
}
