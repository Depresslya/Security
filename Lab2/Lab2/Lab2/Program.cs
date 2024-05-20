using Bogus;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

var userFaker = new Faker<User>()
    .RuleFor(user => user.email, faker => faker.Person.Email)
    .RuleFor(user => user.blocked, false)
    .RuleFor(user => user.email_verified, true)
    .RuleFor(user => user.given_name, faker => faker.Person.FirstName)
    .RuleFor(user => user.family_name, faker => faker.Person.LastName)
    .RuleFor(user => user.name, faker => faker.Person.FirstName)
    .RuleFor(user => user.nickname, faker => faker.Random.String(5, 10))
    .RuleFor(user => user.picture, "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/User_icon-cp.svg/828px-User_icon-cp.svg.png")
    .RuleFor(user => user.connection, "Username-Password-Authentication")
    .RuleFor(user => user.password, "SuperStrongPassword123!");

List<AuthServer> authServers = new()
{
    new("KPI", "https://kpi.eu.auth0.com/api/v2/", "JIvCO5c2IBHlAe2patn6l6q5H35qxti0",
        "ZRF8Op0tWM36p1_hxXTU-B0K_Gq_-eAVtlrQpY24CasYiDmcXBhNS6IJMNcz1EgB", 
        "client_credentials", "https://kpi.eu.auth0.com/"),

    new("Ivan_Gluhov", "https://dev-j8ohq2szxgwgviok.us.auth0.com/api/v2/", "Rrz5DK3D3DC5kRYWtK5Ya30GYnSJuKuB",
        "sYmDO5rzEzY2HCgFbM7QYhgCECrEluCH8dZ2sJZnGAz9gyqKh9EfugaYmf2Zb9qx",
        "client_credentials", "https://dev-j8ohq2szxgwgviok.us.auth0.com/")
};

foreach (var server in authServers)
{
    AccessTokenResponse? accessToken = await GetAccessTokenAsync(server);

    if (accessToken is null) continue;

    User simpleUser = userFaker.Generate();
    UserCreatedResponse? userCreatedResponse = await CreateUserAsync(server, accessToken, simpleUser);

    if (userCreatedResponse is null) continue;

    Console.WriteLine($"=====================REQUEST TO {server.Name}================");
    Console.WriteLine("RESULT OF REQUESTING ACCESS TOKEN:");
    Console.WriteLine($"ACCESS TOKEN: {accessToken.Access_Token}");
    Console.WriteLine($"TOKEN TYPE: {accessToken.Token_Type}");
    Console.WriteLine($"EXPIRES IN: {accessToken.Expires_In}");
    Console.WriteLine($"GRANTED SCOPES: {accessToken.Scope}");
    Console.WriteLine("-------------------------------------------------------------------");
    Console.WriteLine("USER CREATED SUCCESSFULLY: ");
    Console.WriteLine($"ID: {userCreatedResponse.User_Id}");
    Console.WriteLine($"BLOCKED: {userCreatedResponse.Blocked}");
    Console.WriteLine($"CREATED AT: {userCreatedResponse.Created_At.ToShortTimeString()}");
    Console.WriteLine($"EMAIL: {userCreatedResponse.Email}");
    Console.WriteLine($"FAMILY NAME: {userCreatedResponse.Family_Name}");
    Console.WriteLine($"GIVEN NAME: {userCreatedResponse.Given_Name}");
    Console.WriteLine("===================================================================");
    Console.WriteLine(new string('\n', 10));
}



static async Task<UserCreatedResponse?> CreateUserAsync(AuthServer server, AccessTokenResponse accessToken, User user)
{
    string uri = Path.Combine(server.BaseUri, "api", "v2", "users");
    HttpClient httpClient = new();

    var request = new HttpRequestMessage(HttpMethod.Post, uri);
    request.Headers.Add("Accept", "application/json");
    request.Headers.Authorization = new AuthenticationHeaderValue(accessToken.Token_Type, accessToken.Access_Token);

    string json = JsonSerializer.Serialize(user);
    var content = new StringContent(json);
    content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

    request.Content = content;

    using HttpResponseMessage response = await httpClient.SendAsync(request);

    return response.IsSuccessStatusCode ? 
        await response.Content.ReadFromJsonAsync<UserCreatedResponse>() :
        null;
}

static async Task<AccessTokenResponse?> GetAccessTokenAsync(AuthServer authProvider)
{
    string uri = Path.Combine(authProvider.BaseUri, "oauth", "token");
    var httpClient = new HttpClient();

    var request = new HttpRequestMessage(HttpMethod.Post, uri);
    request.Headers.Add("Accept", "application/json");

    string body = $"audience={authProvider.Audience}&grant_type={authProvider.GrantType}&client_id={authProvider.ClientId}&client_secret={authProvider.ClientSecret}"; ;
    var content = new StringContent(body);
    content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

    request.Content = content;
    
    using HttpResponseMessage response = await httpClient.SendAsync(request);

    return response.IsSuccessStatusCode ?
        await response.Content.ReadFromJsonAsync<AccessTokenResponse>() :
        null;
}
