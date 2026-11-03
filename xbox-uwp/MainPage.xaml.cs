using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;
using Windows.UI.Core;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace TodXboxApp
{
    public sealed partial class MainPage : Page
    {
        private const string TodLiveTvUrl = "https://www.todtv.com.tr/canli-tv/bein-sports-1?c=spor";
        private Control _activeBrowserControl;
        private bool _isMouseModeActive;

        public MainPage()
        {
            this.InitializeComponent();

            try
            {
                // RequiresPointerMode is configured in App() constructor; disable Xbox TV overscan borders here
                ApplicationView.GetForCurrentView().SetDesiredBoundsMode(ApplicationViewBoundsMode.UseCoreWindow);
            }
            catch
            {
            }

            this.Loaded += OnMainPageLoaded;
        }

        private async void OnMainPageLoaded(object sender, RoutedEventArgs e)
        {
            await InitializeTodWebViewAsync();
        }

        private static bool IsLoginUrl(string url)
        {
            if (string.IsNullOrEmpty(url))
            {
                return false;
            }

            string lower = url.ToLowerInvariant();
            return lower.Contains("/kullanici/giris") ||
                   lower.Contains("/kullanici/uye-ol") ||
                   lower.Contains("/kullanici/sifremi") ||
                   lower.Contains("/giris") ||
                   lower.Contains("/login");
        }

        private void UpdatePointerModeForUrl(string url)
        {
            bool shouldUseMouse = IsLoginUrl(url);
            _isMouseModeActive = shouldUseMouse;

            Control target = _activeBrowserControl ?? TodWebView;
            if (target == null)
            {
                return;
            }

            try
            {
                if (shouldUseMouse)
                {
                    target.RequiresPointer = RequiresPointer.WhenEngaged;
                    target.IsFocusEngagementEnabled = true;
                    target.Focus(FocusState.Programmatic);
                    target.IsFocusEngaged = true;
                }
                else
                {
                    target.IsFocusEngaged = false;
                    target.IsFocusEngagementEnabled = false;
                    target.RequiresPointer = RequiresPointer.Never;
                    target.Focus(FocusState.Programmatic);
                }
            }
            catch
            {
            }
        }

        private void AttachFocusEngagementGuard(Control control)
        {
            control.FocusDisengaged += async (s, args) =>
            {
                if (_isMouseModeActive)
                {
                    await Dispatcher.RunAsync(CoreDispatcherPriority.Low, () =>
                    {
                        try
                        {
                            if (_isMouseModeActive)
                            {
                                control.Focus(FocusState.Programmatic);
                                control.IsFocusEngaged = true;
                            }
                        }
                        catch
                        {
                        }
                    });
                }
            };
        }

        private string LoadBundleScript()
        {
            try
            {
                string scriptPath = Path.Combine(
                    Windows.ApplicationModel.Package.Current.InstalledLocation.Path,
                    "Assets",
                    "tod-xbox-live.bundle.js"
                );

                if (File.Exists(scriptPath))
                {
                    return File.ReadAllText(scriptPath);
                }
            }
            catch
            {
            }

            return string.Empty;
        }

        private async Task InitializeTodWebViewAsync()
        {
            string bundleJs = LoadBundleScript();

            // 1. Try modern WebView2 (already in XAML visual tree)
            try
            {
                await TodWebView.EnsureCoreWebView2Async();

                if (TodWebView.CoreWebView2 != null)
                {
                    _activeBrowserControl = TodWebView;
                    AttachFocusEngagementGuard(TodWebView);

                    var settings = TodWebView.CoreWebView2.Settings;
                    settings.AreDefaultContextMenusEnabled = false;
                    settings.AreDevToolsEnabled = false;
                    settings.IsStatusBarEnabled = false;

                    TodWebView.CoreWebView2.NavigationStarting += (s, args) =>
                    {
                        UpdatePointerModeForUrl(args.Uri);
                    };

                    TodWebView.CoreWebView2.SourceChanged += (s, args) =>
                    {
                        UpdatePointerModeForUrl(TodWebView.CoreWebView2.Source);
                    };

                    TodWebView.CoreWebView2.NavigationCompleted += (s, args) =>
                    {
                        UpdatePointerModeForUrl(TodWebView.CoreWebView2.Source);
                    };

                    if (!string.IsNullOrEmpty(bundleJs))
                    {
                        await TodWebView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(bundleJs);
                    }

                    TodWebView.Source = new Uri(TodLiveTvUrl);
                    return;
                }
            }
            catch
            {
                // Fall back to system UWP WebView below if WebView2 runtime is unavailable on Xbox
            }

            // 2. Guaranteed Xbox OS fallback: System UWP WebView
            try
            {
                BrowserHost.Children.Clear();
                var legacyWebView = new WebView(WebViewExecutionMode.SeparateProcess)
                {
                    HorizontalAlignment = HorizontalAlignment.Stretch,
                    VerticalAlignment = VerticalAlignment.Stretch
                };

                _activeBrowserControl = legacyWebView;
                AttachFocusEngagementGuard(legacyWebView);

                legacyWebView.NavigationStarting += (s, args) =>
                {
                    UpdatePointerModeForUrl(args.Uri != null ? args.Uri.ToString() : string.Empty);
                };

                if (!string.IsNullOrEmpty(bundleJs))
                {
                    legacyWebView.DOMContentLoaded += async (s, args) =>
                    {
                        UpdatePointerModeForUrl(args.Uri != null ? args.Uri.ToString() : string.Empty);
                        try
                        {
                            await legacyWebView.InvokeScriptAsync("eval", new string[] { bundleJs });
                        }
                        catch
                        {
                        }
                    };

                    legacyWebView.NavigationCompleted += async (s, args) =>
                    {
                        UpdatePointerModeForUrl(args.Uri != null ? args.Uri.ToString() : string.Empty);
                        try
                        {
                            await legacyWebView.InvokeScriptAsync("eval", new string[] { bundleJs });
                        }
                        catch
                        {
                        }
                    };
                }

                BrowserHost.Children.Add(legacyWebView);
                legacyWebView.Navigate(new Uri(TodLiveTvUrl));
            }
            catch
            {
            }
        }
    }
}
