# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e4]:
    - generic [ref=e5]:
      - link [ref=e6] [cursor=pointer]:
        - /url: /
        - img [ref=e7]
      - heading "SoporteML" [level=1] [ref=e9]
      - paragraph [ref=e10]: Iniciá sesión en tu cuenta
    - generic [ref=e11]:
      - button "Iniciar Sesión" [ref=e12] [cursor=pointer]
      - button "Registrarse" [ref=e13] [cursor=pointer]
    - generic [ref=e14]:
      - generic [ref=e15]:
        - text: Email
        - textbox "Email" [ref=e16]:
          - /placeholder: tu@empresa.com
      - generic [ref=e17]:
        - text: Contraseña
        - textbox "Contraseña" [ref=e18]:
          - /placeholder: ••••••••
      - button "Iniciar Sesión" [disabled]
    - paragraph [ref=e19]:
      - text: ¿No tenés cuenta?
      - button "Registrate gratis" [ref=e20] [cursor=pointer]
```