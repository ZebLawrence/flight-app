# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "Admin Login" [level=1] [ref=e4]
    - generic [ref=e5]:
      - alert [ref=e6]: Invalid credentials
      - generic [ref=e7]:
        - generic [ref=e8]: Email
        - textbox "Email" [ref=e9]: wrong@example.com
      - generic [ref=e10]:
        - generic [ref=e11]: Password
        - textbox "Password" [ref=e12]: wrongpassword
      - button "Sign In" [ref=e13] [cursor=pointer]
  - alert [ref=e14]
```