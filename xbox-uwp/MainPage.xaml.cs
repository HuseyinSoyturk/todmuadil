using System;
using System.IO;
using System.Threading.Tasks;
using Windows.Storage;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace TodXboxApp
{
    public sealed partial class MainPage : Page
    {
        private const string TodLiveTvUrl = "https://www.todtv.com.tr/canli-tv";

        public MainPage()
        {
            this.InitializeComponent();

            // Disable Xbox virtual mouse cursor so D-Pad spatial navigation controls the UI
            Application.Current.RequiresPointerMode = ApplicationRequiresPointerMode.WhenRequested;

            // Remove Xbox TV overscan borders so 65-inch TV uses full 100% screen area
            ApplicationView.GetForCurrentView().SetDesiredBoundsMode(ApplicationViewBoundsMode.UseCoreWindow);

            this.Loaded += OnMainPageLoaded;
        }

        private async void OnMainPageLoaded(object sender, RoutedEventArgs e)
        {
            await InitializeTodWebViewAsync();
        }

        private async Task InitializeTodWebViewAsync()
        {
            // Persist cookies and localStorage under ApplicationData.Current.LocalFolder
            StorageFolder localFolder = ApplicationData.Current.LocalFolder;
            Environment.SetEnvironmentVariable("WEBVIEW2_USER_DATA_FOLDER", localFolder.Path);

            await TodWebView.EnsureCoreWebView2Async();

            var settings = TodWebView.CoreWebView2.Settings;
            settings.AreDefaultContextMenusEnabled = false;
            settings.AreDevToolsEnabled = false;
            settings.IsStatusBarEnabled = false;

            string scriptPath = Path.Combine(
                Windows.ApplicationModel.Package.Current.InstalledLocation.Path,
                "Assets",
                "tod-xbox-live.bundle.js"
            );

            if (File.Exists(scriptPath))
            {
                string bundleJs = await File.ReadAllTextAsync(scriptPath);
                await TodWebView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(bundleJs);
            }

            TodWebView.Source = new Uri(TodLiveTvUrl);
        }
    }
}
