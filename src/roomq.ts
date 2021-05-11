import jwt from "jsonwebtoken";
import qs from "querystring";
import { IHttpContextProvider } from "./HttpContextProvider";
import ValidationResult from "./models/ValidationResult";
import { v4 as uuid } from "uuid";

class RoomQ {
  private tokenName: string;
  private static sessionIdName = "be_roomq_t_session_id";

  constructor(
    private clientID: string,
    private jwtSecret: string,
    private ticketIssuer: string,
    private debug: boolean = false
  ) {
    this.tokenName = `be_roomq_t_${clientID}`;
  }

  validate(provider: IHttpContextProvider, returnURL: string | null, sessionId: string | null) {
    let token = provider.getHttpRequest().getQueryValue("noq_t");
    if (!token) {
      token = provider.getHttpRequest().getCookieValue(this.tokenName);
    }
    const currentUrl = provider.getHttpRequest().getAbsoluteUri();

    let needGenerateJWT = false;
    let needRedirect = false;

    if (!token) {
      needGenerateJWT = true;
      needRedirect = true;
      this.debugPrint("no jwt");
    } else {
      try {
        this.debugPrint(`current jwt ${token}`);
        const payload = jwt.verify(token, this.jwtSecret, {
          ignoreExpiration: true,
        }) as {
          room_id: string;
          session_id: string;
          type: "serving" | "queue" | "stopped" | "bot" | "self-sign";
          deadline: number | undefined;
        };
        if (sessionId && payload.session_id !== sessionId) {
          needGenerateJWT = true;
          needRedirect = true;
          this.debugPrint("session id not match");
        } else if (
          payload.deadline &&
          payload.deadline * 1000 < new Date().getTime()
        ) {
          needRedirect = true;
          this.debugPrint("deadline exceed");
        } else if (payload.type === "queue") {
          needRedirect = true;
          this.debugPrint("in queue");
        } else if (payload.type === "self-sign") {
          needRedirect = true;
          this.debugPrint("self sign token");
        }
      } catch (e) {
        needGenerateJWT = true;
        needRedirect = true;
        this.debugPrint("invalid secret");
      }
    }

    if (needGenerateJWT) {
      token = this.generateJWT(sessionId);
      this.debugPrint(`generating new jwt ${token}`);
    }

    provider
      .getHttpResponse()
      .setCookie(
        this.tokenName,
        token!,
        "",
        new Date(new Date().getTime() + 12 * 60 * 60 * 1000)
      );

    if (needRedirect) {
      return this.redirectToTicketIssuer(token!, returnURL || currentUrl);
    } else {
      return this.enter(currentUrl);
    }
  }

  private debugPrint(message: string) {
    if (this.debug) {
      console.log(`[RoomQ] ${message}`);
    }
  }

  private generateJWT(sessionId: string | null): string {
    return jwt.sign(
      {
        room_id: this.clientID,
        session_id: sessionId || uuid(),
        type: "self-sign",
      },
      this.jwtSecret
    );
  }

  private removeNoQToken(url: string): string{
    return url.replace(
      new RegExp("([&]*)(noq_t=[^&]*)", "i"),
      ""
    ).replace(new RegExp("\\?&","i"),"?").replace(new RegExp("\\?$","i"),"");
  }
  private enter(currentUrl: string): ValidationResult {
    const urlWithoutToken = this.removeNoQToken(currentUrl)
    // redirect if url contain token
    if (urlWithoutToken !== currentUrl) {
      return new ValidationResult(urlWithoutToken);
    }
    return new ValidationResult(null);
  }

  private redirectToTicketIssuer(
    token: string,
    currentUrl: string
  ): ValidationResult {
    const urlWithoutToken = this.removeNoQToken(currentUrl)
    const params = {
      noq_t: token,
      noq_c: this.clientID,
      noq_r: urlWithoutToken,
    };
    const query = qs.stringify(params);
    return new ValidationResult(
      `${this.ticketIssuer}?${query}`
    );
  }
}

export default RoomQ;
