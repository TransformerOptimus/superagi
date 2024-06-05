<p align="center">
  <a href="https://superagi.com//#gh-light-mode-only">
    <img src="https://superagi.com/wp-content/uploads/2023/05/Logo-dark.svg" width="318px" alt="SuperAGI logo" />
  </a>
  <a href="https://superagi.com//#gh-dark-mode-only">
    <img src="https://superagi.com/wp-content/uploads/2023/05/Logo-light.svg" width="318px" alt="SuperAGI logo" />
  </a>
</p>

# SuperAGI - Google Calendar Toolkit

Introducing the Google Calendar Toolkit, a powerful integration for SuperAGI. With the Google Calendar toolkit, you have the ability to do the following:

1. **Create Calendar Events**
2. **List your Calendar Events**
3. **Fetch an event from your Calendar**
4. **Delete Calendar Events**

## ⚙️ Installation

### ⚒️ Setting up of SuperAGI

Set up SuperAGI by following the instructions given [here](https://github.com/TransformerOptimus/SuperAGI/blob/main/README.MD)

# ✅ Quickstart Guide:

In order to get started with integrating Google Calendar with SuperAGI, you need to do the following:

## API Creation and OAuth Consent Screen

1. Go to Google Developer Console:
[https://console.cloud.google.com/](https://console.cloud.google.com/) & Create a new project. If you’re having an existing project, you can proceed with that as well:

![GC1](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/9cd9040c-84ac-425b-8aa2-2cf6ea33fd43)

2. After the project is created/you’re in your selected project, head to “APIs and Services”

![GC2](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/18763990-5cd2-476d-8b41-ce195e218bd2)

3. Click on “ENABLED APIS AND SERVICES” and search for “Google Calendar”

![GC3](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/b88fcf5d-793d-4add-af98-ef8457239b03)
![GC4](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/35480885-7b2e-4bb6-842b-68a00117b02d)

4. Enable the API
   
![GC5](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/ad0dbec0-0177-484a-985d-c8c7f48fe667)

5. Once the API is Enabled, go to “OAuth Consent Screen” 

![GC6](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/b0eb2e92-b837-4d46-82fc-5c392529c676)

6. Select your User Type as “External” and click on "Create"

![GC7](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/866553cd-d670-4dea-988b-222ca4577b71)

7. Fill in the required details such as the App Information, App Domain, Authorized Domain, and Developer contact information. Once filled in, click “Save and Continue” 

![GC8](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/d06b0f19-8a3c-4d61-b03a-c15a8df678da)

8. On the next page, you don’t need to select the scopes. Proceed to “save and continue” and at the final page, review the process and click “Back to Dashboard”.  With this, you’ve created your OAuth Consent Screen for Google Calendar.
   
9. You can go ahead and click the “Publish App” 

![GC9](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/5f75c29b-90fa-4879-bc32-0373f748e0dd)

## 🔧 Configuring endpoints & obtaining Client ID and Client Secret Key

In order to obtain the Client ID and Secret ID, you need to do the following steps: 

1. Go to “Credentials” Page

![GC10](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/4a28b0fe-9fd4-444f-8456-f07cf9df5f45)

2. Click on “Create Credentials” and click on “OAuth Client ID”

![GC11](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/389dc30a-0468-48a2-8056-1dd989e3021c)

![GC12](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/7798d795-1773-4b3f-b955-6bf93f827613)

3. Once you click on OAuth Client ID, choose the type of application as “Web Application” and give it a name of your choice

![GC13](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/ee171a3c-2036-4969-a1d0-2af4d7b4010f)

4. Create JavaScript Origins and add the following details as shown in the image: 

![GC14](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/d2292b25-ce32-4d3d-903c-1ca9341163fb)

5. Go to Authorized redirect URIs and add the following URIs: 
`https://app.superagi.com/api/google/oauth-tokens`
`http://localhost:3000/api/google/oauth-tokens`

![Google_OAuth_URI](https://github.com/Phoenix2809/SuperAGI/assets/133874957/9f7bd411-7173-4550-9bfd-0f3cf95dad54)

6. Once you have added the Authorized redirect URIs, you can click “Create” to obtain the Client ID and Client Secret Key

![GC16](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/46c106aa-2ad6-470c-bbd5-c1c1a4f64205)

7. Copy the Client ID and Secret Key and save it in a file. 

## Configuring your Client ID, Secret Key and Authenticating Calendar with SuperAGI

Once the ClientID and Secret Key are obtained, you can configure and authorize Calendar to be used with SuperAGI by following these steps: 

1. Add your Client ID and Client Secret Key on the toolkit page and click on “Update Changes”

![GC_17](https://github.com/TransformerOptimus/SuperAGI/assets/133874957/911f57b7-c977-45d6-bcaf-ee77430e8628)

2. Click on “Authenticate Tool” - which will now take you to the OAuth Flow. 

Once the OAuth Authentication is complete, you can now start using SuperAGI Agents with Google Calendar!

(Note: You will need to use the "List Google Calendar Event" Tool and the "Read File" Tool in order for the "Fetch Google Calendar Event" and "Delete Google Calendar Event" Tool to work, as it requires the Event ID that's obtained by "List Google Calendar Event" tool as a CSV)
