using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace TodXboxApp
{
    public sealed partial class MainPage : Page
    {
        private const string TodLiveTvUrl = "https://www.todtv.com.tr/canli-tv/bein-sports-1?c=spor";

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
                    var settings = TodWebView.CoreWebView2.Settings;
                    settings.AreDefaultContextMenusEnabled = false;
                    settings.AreDevToolsEnabled = false;
                    settings.IsStatusBarEnabled = false;

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

            // 2. Guaranteed Xbox OS fallback: System UWP WebView with ES2017 bundle & reCAPTCHA bridge
            try
            {
                BrowserHost.Children.Clear();
                var legacyWebView = new WebView(WebViewExecutionMode.SeparateProcess)
                {
                    HorizontalAlignment = HorizontalAlignment.Stretch,
                    VerticalAlignment = VerticalAlignment.Stretch
                };

                if (!string.IsNullOrEmpty(bundleJs))
                {
                    legacyWebView.DOMContentLoaded += async (s, args) =>
                    {
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
