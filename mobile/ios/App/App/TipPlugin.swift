import Capacitor
import StoreKit

// Product IDs must match what you create in App Store Connect.
// Use consumable type for one-time tips.
private let tipProductIds: Set<String> = [
    "com.djsethduncan.tamofishi.tip.small",
    "com.djsethduncan.tamofishi.tip.medium",
    "com.djsethduncan.tamofishi.tip.large",
]

@objc(TipPlugin)
public class TipPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TipPlugin"
    public let jsName = "TipPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase",    returnType: CAPPluginReturnPromise),
    ]

    private var updatesTask: Task<Void, Never>?

    override public func load() {
        updatesTask = Task {
            for await result in Transaction.updates {
                switch result {
                case .verified(let transaction): await transaction.finish()
                case .unverified(let transaction, _): await transaction.finish()
                }
            }
        }
    }

    deinit { updatesTask?.cancel() }

    @objc func getProducts(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: tipProductIds)
                    .sorted { $0.price < $1.price }
                call.resolve(["products": products.map {
                    ["id": $0.id, "displayName": $0.displayName, "displayPrice": $0.displayPrice]
                }])
            } catch {
                call.reject("Failed to load products", nil, error)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId required")
            return
        }
        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    call.reject("Product not found")
                    return
                }
                switch try await product.purchase() {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        call.resolve(["status": "success"])
                    case .unverified(_, let error):
                        call.reject("Purchase unverified", nil, error)
                    }
                case .pending:
                    call.resolve(["status": "pending"])
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                @unknown default:
                    call.reject("Unknown result")
                }
            } catch {
                call.reject("Purchase failed", nil, error)
            }
        }
    }
}
