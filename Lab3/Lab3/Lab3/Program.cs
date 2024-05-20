using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;



var authServers = new List<AuthServer>()
{
    new("Ivan_Gluhov", "https://dev-j8ohq2szxgwgviok.us.auth0.com/api/v2/",
        "Rrz5DK3D3DC5kRYWtK5Ya30GYnSJuKuB", "sYmDO5rzEzY2HCgFbM7QYhgCECrEluCH8dZ2sJZnGAz9gyqKh9EfugaYmf2Zb9qx",
        "password", "https://dev-j8ohq2szxgwgviok.us.auth0.com/", new UserCredentials("gluhov.ivan@lll.kpi.ua", "VeryVeryStrong123!"))
};

foreach (var server in authServers)
{
    Console.WriteLine("=================================================================================");
    AccessTokenResponse? accessToken = await GetAccessTokenByPasswordAsync(server);

    if (accessToken is null) return;

    Console.WriteLine($"1.RECEIVED REFRESH TOKEN: {accessToken.Refresh_Token}" + new string('\n', 3));

    AccessTokenResponse? refreshedToken = await RefreshTokenAsync(server, accessToken.Refresh_Token);

    if (refreshedToken is null) return;
    Console.WriteLine($"2.RECEIVED NEW(REFRESHED) ACCESS TOKEN: {refreshedToken.Access_Token}" + new string('\n', 3));

    AccessTokenResponse? tokenForManagement = await GetDefaultAccessTokenAsync(server);

    if (tokenForManagement is null) return;

    await ChangePasswordAsync(server, "664b2621cddc69d8a11f3717", tokenForManagement.Access_Token, "NewVeryVeryStrongPassword123!");
    Console.WriteLine("=================================================================================");
}

static async Task<AccessTokenResponse?> GetDefaultAccessTokenAsync(AuthServer authProvider)
{
    string uri = Path.Combine(authProvider.BaseUri, "oauth", "token");
    var httpClient = new HttpClient();

    var request = new HttpRequestMessage(HttpMethod.Post, uri);
    request.Headers.Add("Accept", "application/json");

    UserCredentials credentials = authProvider.user;

    string body =
        $"audience={authProvider.Audience}" +
        $"&grant_type=client_credentials" +
        $"&client_id={authProvider.ClientId}" +
        $"&client_secret={authProvider.ClientSecret}";


    var content = new StringContent(body);
    content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

    request.Content = content;

    using HttpResponseMessage response = await httpClient.SendAsync(request);

    return response.IsSuccessStatusCode ? 
        await response.Content.ReadFromJsonAsync<AccessTokenResponse?>() :
        null;
}

static async Task<AccessTokenResponse?> GetAccessTokenByPasswordAsync(AuthServer authProvider)
{
    string uri = Path.Combine(authProvider.BaseUri, "oauth", "token");
    var httpClient = new HttpClient();

    var request = new HttpRequestMessage(HttpMethod.Post, uri);
    request.Headers.Add("Accept", "application/json");

    var credentials = authProvider.user;

    string body =
        $"username={credentials.Username}" +
        $"&password={credentials.Password}" +
        $"&audience={authProvider.Audience}" +
        $"&grant_type={authProvider.GrantType}" +
        $"&client_id={authProvider.ClientId}" +
        $"&client_secret={authProvider.ClientSecret}" +
        $"&scope=offline_access"; 


    var content = new StringContent(body);
    content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

    request.Content = content;

    using HttpResponseMessage response = await httpClient.SendAsync(request);

    return response.IsSuccessStatusCode ?
            await response.Content.ReadFromJsonAsync<AccessTokenResponse?>() :
            null;
}

static async Task<AccessTokenResponse?> RefreshTokenAsync(AuthServer authProvider, string refreshToken)
{
    string uri = Path.Combine(authProvider.BaseUri, "oauth", "token");
    var httpClient = new HttpClient();

    var request = new HttpRequestMessage(HttpMethod.Post, uri);
    request.Headers.Add("Accept", "application/json");

    string body = "" +
        $"grant_type=refresh_token" +
        $"&client_id={authProvider.ClientId}" +
        $"&client_secret={authProvider.ClientSecret}" +
        $"&refresh_token={refreshToken}";

    var content = new StringContent(body);
    content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

    request.Content = content;

    using HttpResponseMessage response = await httpClient.SendAsync(request);

    return response.IsSuccessStatusCode ?
            await response.Content.ReadFromJsonAsync<AccessTokenResponse?>() :
            null;
}

static async Task ChangePasswordAsync(AuthServer authProvider, string userId, string accessToken, string newPassword)
{
    string uri = Path.Combine(authProvider.BaseUri, "api", "v2", "users", $"auth0|{userId}");
    var httpClient = new HttpClient();

    var request = new HttpRequestMessage(HttpMethod.Patch, uri);
    request.Headers.Add("Accept", "application/json");
    request.Headers.Add("Authorization", $"Bearer {accessToken}");
    
    object body = new
    {
        password = newPassword,
        connection = "Username-Password-Authentication"
    };

    request.Content = new StringContent( JsonSerializer.Serialize(body), new MediaTypeHeaderValue("application/json") );

    using HttpResponseMessage response = await httpClient.SendAsync(request);
 
    if (response.IsSuccessStatusCode)
    {
        string content = await response.Content.ReadAsStringAsync();
        Console.WriteLine(content);
    }
}
